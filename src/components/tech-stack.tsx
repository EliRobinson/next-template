import { Card, CardContent } from '@elirobinson/react/components/molecules/Card'

export interface StackItem {
  name: string
  description: string
}

export function TechStack({ items }: { items: readonly StackItem[] }) {
  return (
    <div className='grid grid-cols-2 gap-3 text-left sm:grid-cols-3'>
      {items.map((item) => (
        <Card key={item.name}>
          <CardContent className='p-3'>
            <p className='t-body-sm font-medium'>{item.name}</p>
            <p className='t-caption'>{item.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
