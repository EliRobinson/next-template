export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="max-w-2xl text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">Next Template</h1>
        <p className="text-muted-foreground mb-8">
          A production-ready Next.js starter with TypeScript, Tailwind CSS, shadcn/ui, TanStack, and
          best-practice tooling pre-configured.
        </p>

        <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
          {stack.map((item) => (
            <div
              key={item.name}
              className="bg-card text-card-foreground rounded-lg border p-3 shadow-sm"
            >
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-muted-foreground text-xs">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

const stack = [
  { name: "Next.js 15", description: "App Router + Turbopack" },
  { name: "TypeScript 5", description: "Strict mode + path aliases" },
  { name: "Tailwind CSS 4", description: "Utility-first styling" },
  { name: "shadcn/ui", description: "Accessible components" },
  { name: "TanStack Query", description: "Async state management" },
  { name: "TanStack Table", description: "Headless table primitives" },
  { name: "TanStack Form", description: "Type-safe forms" },
  { name: "TanStack Virtual", description: "List & grid virtualization" },
  { name: "Vitest + RTL", description: "Unit & integration tests" },
  { name: "Playwright", description: "E2E & functional tests" },
  { name: "ESLint + Prettier", description: "Consistent code style" },
  { name: "Commitizen", description: "Conventional commits" },
];
