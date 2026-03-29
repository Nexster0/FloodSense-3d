import { generateText, Output } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Using Gemini Flash for PDF and Excel parsing (free tier available, vision capable)
const GEMINI_MODEL = 'google/gemini-2.5-flash-preview-04-17'

// Schema for parsed bulletin data
const BulletinDataSchema = z.object({
  general_situation: z.string().nullable().describe('General flood situation description in Russian'),
  dangerous_sections: z.array(z.string()).describe('List of dangerous river sections'),
  stations: z.array(
    z.object({
      name: z.string().describe('Station name in Russian'),
      river: z.string().describe('River name'),
      level_cm: z.number().describe('Water level in centimeters'),
      change_cm: z.number().describe('Change from previous day in cm'),
      status: z.enum(['NORMAL', 'WATCH', 'WARNING', 'DANGER', 'CRITICAL']),
      forecast: z.enum(['rising', 'falling', 'stable']),
    })
  ),
  bulletin_date: z.string().describe('Bulletin date in YYYY-MM-DD format'),
  week_number: z.number().describe('Week number of the year'),
})

// Schema for Excel data parsing
const ExcelDataSchema = z.object({
  stations: z.array(
    z.object({
      name: z.string().describe('Station name'),
      river: z.string().nullable().describe('River name if available'),
      level_cm: z.number().describe('Water level in centimeters'),
      change_cm: z.number().describe('Change from previous measurement'),
      date: z.string().describe('Date of measurement in YYYY-MM-DD format'),
    })
  ),
  metadata: z.object({
    source: z.string().nullable().describe('Data source'),
    period: z.string().nullable().describe('Data period'),
    total_rows: z.number().describe('Total number of data rows'),
  }),
})

// Validate if the API response contains valid float values
function validateStationData(stations: z.infer<typeof BulletinDataSchema>['stations']): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  for (const station of stations) {
    if (!Number.isFinite(station.level_cm)) {
      errors.push(`Invalid level_cm for ${station.name}: ${station.level_cm}`)
    }
    if (!Number.isFinite(station.change_cm)) {
      errors.push(`Invalid change_cm for ${station.name}: ${station.change_cm}`)
    }
    if (station.level_cm < 0 || station.level_cm > 2000) {
      errors.push(`Suspicious level_cm for ${station.name}: ${station.level_cm}cm`)
    }
  }

  return { valid: errors.length === 0, errors }
}

// Check if Gemini API is active and responding
async function checkAPIHealth(): Promise<{ active: boolean; error?: string }> {
  try {
    const result = await generateText({
      model: GEMINI_MODEL,
      prompt: 'Reply with just "OK" to confirm you are operational.',
      maxOutputTokens: 10,
    })
    return { active: result.text.toLowerCase().includes('ok') }
  } catch (error) {
    return { active: false, error: (error as Error).message }
  }
}

// Detect file type from base64 or URL
function detectFileType(base64?: string, url?: string): 'pdf' | 'excel' | 'image' | 'unknown' {
  if (url) {
    const lowerUrl = url.toLowerCase()
    if (lowerUrl.endsWith('.pdf')) return 'pdf'
    if (lowerUrl.endsWith('.xlsx') || lowerUrl.endsWith('.xls')) return 'excel'
    if (lowerUrl.match(/\.(png|jpg|jpeg|webp|gif)$/)) return 'image'
  }
  if (base64) {
    // Check magic bytes
    if (base64.startsWith('JVBERi')) return 'pdf' // %PDF
    if (base64.startsWith('UEsDB')) return 'excel' // PK (ZIP/XLSX)
    if (base64.startsWith('/9j/')) return 'image' // JPEG
    if (base64.startsWith('iVBOR')) return 'image' // PNG
  }
  return 'unknown'
}

export async function POST(req: Request) {
  try {
    const { pdfUrl, pdfBase64, excelBase64, fileType: providedFileType } = await req.json()

    if (!pdfUrl && !pdfBase64 && !excelBase64) {
      return Response.json(
        { error: 'Either pdfUrl, pdfBase64, or excelBase64 is required' },
        { status: 400 }
      )
    }

    // Detect file type
    const fileType = providedFileType || detectFileType(pdfBase64 || excelBase64, pdfUrl)
    const isExcel = fileType === 'excel' || !!excelBase64

    // Check API health first
    const health = await checkAPIHealth()
    if (!health.active) {
      return Response.json(
        { error: 'Gemini API is not responding', details: health.error },
        { status: 503 }
      )
    }

    let fileContent: { type: 'file'; data: string; mimeType: string }

    if (excelBase64) {
      // Excel file
      fileContent = {
        type: 'file',
        data: excelBase64,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    } else if (pdfBase64) {
      // PDF file from base64
      fileContent = {
        type: 'file',
        data: pdfBase64,
        mimeType: 'application/pdf',
      }
    } else {
      // Fetch file from URL and convert to base64
      const response = await fetch(pdfUrl)
      if (!response.ok) {
        return Response.json(
          { error: 'Failed to fetch file', details: response.statusText },
          { status: 400 }
        )
      }
      const buffer = await response.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const contentType = response.headers.get('content-type') || 'application/pdf'
      fileContent = {
        type: 'file',
        data: base64,
        mimeType: contentType,
      }
    }

    // Different prompts for PDF vs Excel
    const prompt = isExcel
      ? `This is an Excel file containing hydrological data from Kazakhstan.

Please extract the following information:

1. For each row with station data, extract:
   - Station name
   - River name (if available)
   - Water level in cm
   - Change from previous measurement
   - Date of measurement

2. Metadata about the file:
   - Data source
   - Data period covered
   - Total number of data rows

Important:
- All text should remain in Russian/Kazakh as-is
- Water levels should be in centimeters
- Dates should be in YYYY-MM-DD format
- If a value is unclear, use the most reasonable estimate

Return the data as structured JSON.`
      : `This is a Kazhydromet flood bulletin (гидрологический бюллетень) for Aktobe Oblast, Kazakhstan.

Please extract the following information from this PDF:

1. General flood situation description (общая обстановка)
2. List of dangerous river sections (опасные участки)
3. For each monitoring station, extract:
   - Station name (название поста)
   - River name (река)
   - Current water level in cm (уровень воды)
   - Change from previous measurement in cm (изменение)
   - Status based on levels: NORMAL, WATCH, WARNING, DANGER, or CRITICAL
   - Forecast: rising (рост), falling (спад), or stable (стабильно)
4. Bulletin date
5. Week number

Important: 
- All text should remain in Russian
- Water levels should be in centimeters (cm)
- If a value is unclear, use the most reasonable estimate
- Look for tables with station data

Return the data as structured JSON matching the schema.`

    // Parse using Gemini with vision capabilities
    const result = await generateText({
      model: GEMINI_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            fileContent,
            { type: 'text', text: prompt },
          ],
        },
      ],
      output: Output.object({ schema: isExcel ? ExcelDataSchema : BulletinDataSchema }),
      maxOutputTokens: 8000,
    })

    const parsedData = result.output

    if (!parsedData) {
      return Response.json(
        { error: 'Failed to parse file', details: 'No output from Gemini model' },
        { status: 500 }
      )
    }

    // Handle Excel data differently
    if (isExcel) {
      const excelData = parsedData as z.infer<typeof ExcelDataSchema>
      
      // Store readings from Excel
      const supabase = await createClient()
      let insertedCount = 0
      
      for (const station of excelData.stations) {
        // Try to match with existing stations
        const { data: matchedStations } = await supabase
          .from('gauge_stations')
          .select('id')
          .ilike('name_ru', `%${station.name}%`)
          .limit(1)

        if (matchedStations && matchedStations.length > 0) {
          // Determine status based on level
          const { data: stationData } = await supabase
            .from('gauge_stations')
            .select('danger_level_cm, warning_level_cm, normal_level_cm')
            .eq('id', matchedStations[0].id)
            .single()

          let status: 'NORMAL' | 'WATCH' | 'WARNING' | 'DANGER' | 'CRITICAL' = 'NORMAL'
          if (stationData) {
            if (station.level_cm >= stationData.danger_level_cm) status = 'DANGER'
            else if (station.level_cm >= stationData.warning_level_cm) status = 'WARNING'
            else if (station.level_cm >= stationData.normal_level_cm) status = 'WATCH'
          }

          const forecast = station.change_cm > 5 ? 'rising' : station.change_cm < -5 ? 'falling' : 'stable'

          const { error } = await supabase.from('gauge_readings').upsert({
            station_id: matchedStations[0].id,
            level_cm: station.level_cm,
            change_cm: station.change_cm,
            status,
            forecast,
            source: 'excel_import',
            recorded_at: station.date || new Date().toISOString(),
          }, {
            onConflict: 'station_id,recorded_at',
          })

          if (!error) insertedCount++
        }
      }

      return Response.json({
        success: true,
        fileType: 'excel',
        data: excelData,
        inserted: insertedCount,
        total: excelData.stations.length,
        model: GEMINI_MODEL,
        usage: result.usage,
      })
    }

    // Handle PDF bulletin data
    const bulletinData = parsedData as z.infer<typeof BulletinDataSchema>
    
    // Validate the extracted data
    const validation = validateStationData(bulletinData.stations)
    if (!validation.valid) {
      console.warn('[v0] Validation warnings:', validation.errors)
    }

    // Store in Supabase bulletin_cache
    const supabase = await createClient()
    const currentYear = new Date().getFullYear()

    const { error: cacheError } = await supabase.from('bulletin_cache').upsert({
      week_number: bulletinData.week_number,
      year: currentYear,
      pdf_url: pdfUrl || null,
      raw_json: bulletinData,
      general_situation: bulletinData.general_situation,
      dangerous_sections: bulletinData.dangerous_sections,
      parsed_by: 'gemini',
      parsed_at: new Date().toISOString(),
    }, {
      onConflict: 'week_number,year',
    })

    if (cacheError) {
      console.error('[v0] Failed to cache bulletin:', cacheError)
    }

    // Update gauge_readings if we matched stations
    for (const stationData of bulletinData.stations) {
      // Try to match with existing stations
      const { data: matchedStations } = await supabase
        .from('gauge_stations')
        .select('id')
        .ilike('name_ru', `%${stationData.name}%`)
        .limit(1)

      if (matchedStations && matchedStations.length > 0) {
        const { error: readingError } = await supabase.from('gauge_readings').upsert({
          station_id: matchedStations[0].id,
          level_cm: stationData.level_cm,
          change_cm: stationData.change_cm,
          status: stationData.status,
          forecast: stationData.forecast,
          bulletin_week: bulletinData.week_number,
          bulletin_year: currentYear,
          source: 'bulletin_pdf',
          recorded_at: bulletinData.bulletin_date,
        }, {
          onConflict: 'station_id,recorded_at',
        })

        if (readingError) {
          console.error(`[v0] Failed to insert reading for ${stationData.name}:`, readingError)
        }
      }
    }

    return Response.json({
      success: true,
      fileType: 'pdf',
      data: bulletinData,
      validation,
      model: GEMINI_MODEL,
      usage: result.usage,
    })
  } catch (error) {
    console.error('[v0] Parse file error:', error)
    return Response.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// GET endpoint to check API health
export async function GET() {
  const health = await checkAPIHealth()
  return Response.json({
    status: health.active ? 'healthy' : 'unhealthy',
    model: GEMINI_MODEL,
    capabilities: ['pdf', 'excel', 'image'],
    error: health.error,
    timestamp: new Date().toISOString(),
  })
}
