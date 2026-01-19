# React Query App Example

A complete React application demonstrating Bridge-generated React Query hooks.

## Features Demonstrated

- React Query v5 hooks for data fetching
- Automatic cache invalidation
- Loading and error states
- Mutations with optimistic updates
- TypeScript types and type guards
- Zod schemas for validation

## Project Structure

```
react-query-app/
├── petstore.yaml           # OpenAPI specification
├── bridge.config.ts        # Bridge configuration
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration
├── src/
│   ├── main.tsx            # React entry point
│   ├── App.tsx             # Main App component
│   ├── App.css             # Styles
│   ├── components/
│   │   ├── PetList.tsx     # Pet list with useListPets hook
│   │   ├── PetDetail.tsx   # Pet details with useGetPet hook
│   │   └── CreatePetForm.tsx # Form with useCreatePet hook
│   └── generated/          # Generated code (after running generate)
│       ├── types.ts        # TypeScript types
│       ├── schemas.ts      # Zod schemas
│       ├── client.ts       # HTTP client
│       ├── hooks.ts        # React Query hooks
│       └── index.ts        # Barrel export
└── package.json
```

## Usage

1. Install dependencies:
```bash
npm install
```

2. Generate the API client:
```bash
npm run generate
```

3. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Generated Hooks

After running `npm run generate`, you'll have these React Query hooks:

### Query Hooks
- `useListPets(params?)` - Fetch list of pets
- `useGetPet(params)` - Fetch a single pet

### Mutation Hooks
- `useCreatePet()` - Create a new pet
- `useUpdatePet()` - Update an existing pet
- `useDeletePet()` - Delete a pet
- `useUploadPetPhoto()` - Upload a pet photo

### Query Keys
- `queryKeys.listPets(params)` - Key for list query
- `queryKeys.getPet(params)` - Key for single pet query

## Example Usage

```tsx
import { useListPets, useCreatePet, queryKeys } from './generated';
import { useQueryClient } from '@tanstack/react-query';

function MyComponent() {
  const queryClient = useQueryClient();

  // Fetch pets
  const { data: pets, isLoading } = useListPets({
    query: { limit: 10 }
  });

  // Create mutation
  const createPet = useCreatePet({
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.listPets._def
      });
    }
  });

  // Create a pet
  const handleCreate = () => {
    createPet.mutate({
      body: {
        name: 'Buddy',
        species: 'dog'
      }
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {pets?.map(pet => (
        <li key={pet.id}>{pet.name}</li>
      ))}
    </ul>
  );
}
```

## Configuration

See `bridge.config.ts` for the configuration:

```typescript
export default defineConfig({
  input: {
    path: './petstore.yaml',
    type: 'openapi',
  },
  output: {
    dir: './src/generated',
  },
  generators: {
    typescript: {
      generateTypeGuards: true,
    },
    zod: true,
    client: {
      baseUrl: 'https://api.petstore.example.com/v1',
    },
    hooks: {
      type: 'react-query',
      suspense: false,
      infinite: true, // Enable infinite query hooks
    },
  },
});
```
