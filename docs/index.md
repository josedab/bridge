---
layout: home

hero:
  name: Bridge
  text: Type-Safe API Clients
  tagline: Generate TypeScript types, Zod schemas, HTTP clients, and React Query hooks from OpenAPI specs
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/bridge-codes/bridge

features:
  - icon: 🔒
    title: Type-Safe
    details: Full TypeScript support with strict type inference from your API specification
  - icon: ⚡
    title: Fast Generation
    details: Blazing fast code generation with incremental rebuilds in watch mode
  - icon: 🧩
    title: Extensible
    details: Plugin architecture allows customization and extension of code generation
  - icon: 🎯
    title: Multiple Outputs
    details: Generate TypeScript types, Zod schemas, HTTP clients, React Query hooks, and more
---

## Quick Start

```bash
# Install
npm install -D @bridge/core

# Generate from OpenAPI spec
npx bridge generate -i ./openapi.yaml -o ./src/api
```

## Example Output

Bridge transforms your OpenAPI specification into type-safe TypeScript code:

```typescript
// Generated types
export interface Pet {
  id: number;
  name: string;
  status: 'available' | 'pending' | 'sold';
}

// Generated client
export const petApi = {
  getPetById: (petId: number) =>
    client.get<Pet>(`/pets/${petId}`),

  updatePet: (petId: number, data: UpdatePetRequest) =>
    client.put<Pet>(`/pets/${petId}`, data),
};

// Generated React Query hooks
export function useGetPetById(petId: number) {
  return useQuery({
    queryKey: ['pets', petId],
    queryFn: () => petApi.getPetById(petId),
  });
}
```
