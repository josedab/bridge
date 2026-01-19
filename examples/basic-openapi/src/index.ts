/**
 * Basic OpenAPI Example
 *
 * This example demonstrates how to use Bridge-generated code
 * with a simple OpenAPI specification.
 */

import { apiClient, type Pet, type CreatePetRequest, isPet } from './generated/index.js';

async function main() {
  console.log('🌉 Bridge Basic OpenAPI Example\n');

  // Configure the client (optional - uses baseUrl from config)
  // apiClient.setConfig({ baseUrl: 'https://api.petstore.example.com/v1' });

  try {
    // Example 1: List all pets
    console.log('📋 Listing pets...');
    const pets = await apiClient.listPets({ query: { limit: 10 } });
    console.log(`Found ${pets.length} pets\n`);

    // Example 2: Create a new pet
    console.log('🐕 Creating a new pet...');
    const newPet: CreatePetRequest = {
      name: 'Buddy',
      species: 'dog',
      breed: 'Golden Retriever',
      age: 3,
      tags: ['friendly', 'trained'],
    };
    const createdPet = await apiClient.createPet({ body: newPet });
    console.log(`Created pet: ${createdPet.name} (${createdPet.id})\n`);

    // Example 3: Get a specific pet
    console.log('🔍 Fetching pet details...');
    const pet = await apiClient.getPet({ path: { petId: createdPet.id } });
    console.log(`Pet details: ${pet.name}, ${pet.species}, ${pet.age} years old\n`);

    // Example 4: Using type guards
    console.log('✅ Type guard validation...');
    const unknownData: unknown = pet;
    if (isPet(unknownData)) {
      console.log(`Validated pet: ${unknownData.name}`);
    } else {
      console.log('Data is not a valid Pet');
    }

    // Example 5: Update a pet
    console.log('\n📝 Updating pet...');
    const updatedPet = await apiClient.updatePet({
      path: { petId: createdPet.id },
      body: { status: 'sold' },
    });
    console.log(`Updated pet status: ${updatedPet.status}\n`);

    // Example 6: Delete a pet
    console.log('🗑️ Deleting pet...');
    await apiClient.deletePet({ path: { petId: createdPet.id } });
    console.log('Pet deleted successfully\n');

    console.log('✨ Example completed successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
