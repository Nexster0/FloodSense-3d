'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Map, BarChart3, Gauge, Settings, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: '3D Карта', icon: Map },
    { href: '/analytics', label: 'Аналитика', icon: BarChart3 },
    { href: '/gauges', label: 'Посты', icon: Gauge },
    { href: '/forecasts', label: 'Прогнозы', icon: Cloud },
    { href: '/admin', label: 'Администрирование', icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true
    if (href !== '/' && pathname.startsWith(href)) return true
    return false
  }

  return (
    <nav className="border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
              FS
            </div>
            <span className="hidden sm:inline">АктобеФлудСенс</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button
                  variant={isActive(href) ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t border-border/50 pb-4 space-y-2">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button
                  variant={isActive(href) ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
