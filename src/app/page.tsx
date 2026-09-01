import { Card, CardContent } from '@elirobinson/react/components/molecules/Card'
import { Eyebrow } from '@elirobinson/react/components/atoms/Eyebrow'

export default function Home() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center gap-8 p-8'>
      <div className='max-w-2xl text-center'>
        <Eyebrow>Starter template</Eyebrow>
        <h1 className='t-h1 mt-3 mb-4'>Next Template</h1>
        <p className='t-lead mb-8'>
          A production-ready Next.js starter with TypeScript, Tailwind CSS, the
          @elirobinson design system, TanStack, and best-practice tooling
          pre-configured.
        </p>

        <div className='grid grid-cols-2 gap-3 text-left sm:grid-cols-3'>
          {stack.map((item) => (
            <Card key={item.name}>
              <CardContent className='p-3'>
                <p className='t-body-sm font-medium'>{item.name}</p>
                <p className='t-caption'>{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}

const stack = [
  { name: 'Next.js 16', description: 'App Router + Turbopack' },
  { name: 'TypeScript 5', description: 'Strict mode + path aliases' },
  { name: 'Tailwind CSS 4', description: 'Utility-first styling' },
  { name: '@elirobinson/react', description: 'Design system components' },
  { name: 'TanStack Query', description: 'Async state management' },
  { name: 'TanStack Table', description: 'Headless table primitives' },
  { name: 'TanStack Form', description: 'Type-safe forms' },
  { name: 'TanStack Virtual', description: 'List & grid virtualization' },
  { name: 'Vitest + RTL', description: 'Unit & integration tests' },
  { name: 'Playwright', description: 'E2E & functional tests' },
  { name: 'ESLint + Prettier', description: 'Consistent code style' },
  { name: 'Commitizen', description: 'Conventional commits' }
]
