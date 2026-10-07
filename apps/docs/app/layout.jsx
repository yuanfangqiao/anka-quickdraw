import { Layout, Navbar, Footer } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'
import './brand.css'

export const metadata = {
  metadataBase: new URL('https://tryquickdraw.com'),
  title: {
    default: 'Quickdraw Docs',
    template: '%s — Quickdraw Docs',
  },
  description:
    'Documentation for Quickdraw, the MIT-licensed infinite-canvas whiteboard SDK for React, React Native, and plain JavaScript.',
  icons: { icon: [{ url: '/docs/favicon.svg', type: 'image/svg+xml' }] },
}

const logo = (
  <span
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: 700,
      fontSize: '17px',
      letterSpacing: '-0.01em',
    }}
  >
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M6 22 C6 12, 12 6, 20 7 C27 8, 28 16, 22 19 C17 21.5, 12 20, 13 15"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="25.5" cy="25.5" r="3" fill="currentColor" />
    </svg>
    Quickdraw
    <span style={{ fontWeight: 500, opacity: 0.55 }}>Docs</span>
  </span>
)

const navbar = (
  <Navbar
    logo={logo}
    logoLink="https://tryquickdraw.com"
    projectLink="https://github.com/nmndwivedi/quickdraw"
  />
)

const footer = (
  <Footer>
    MIT licensed. Built in the open —{' '}
    <a
      href="https://github.com/nmndwivedi/quickdraw"
      target="_blank"
      rel="noreferrer"
      style={{ textDecoration: 'underline' }}
    >
      contributions welcome
    </a>
    .
  </Footer>
)

export default async function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head color={{ hue: 221, saturation: 82, lightness: { light: 45, dark: 65 } }} />
      <body>
        <Layout
          navbar={navbar}
          footer={footer}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/nmndwivedi/quickdraw/edit/main/apps/docs"
          editLink="Edit this page on GitHub"
          sidebar={{ defaultMenuCollapseLevel: 2 }}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
