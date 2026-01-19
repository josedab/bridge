import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreatePet, queryKeys } from '../generated';
import type { CreatePetRequest } from '../generated';

interface CreatePetFormProps {
  onSuccess: () => void;
}

export function CreatePetForm({ onSuccess }: CreatePetFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreatePetRequest>({
    name: '',
    species: 'dog',
    breed: '',
    age: 0,
    tags: [],
  });

  const createPet = useCreatePet({
    onSuccess: () => {
      // Invalidate the pets list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.listPets._def });
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPet.mutate({ body: formData });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'age' ? parseInt(value) || 0 : value,
    }));
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h3>Add New Pet</h3>

      <div className="form-group">
        <label htmlFor="name">Name *</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter pet name"
        />
      </div>

      <div className="form-group">
        <label htmlFor="species">Species</label>
        <select
          id="species"
          name="species"
          value={formData.species}
          onChange={handleChange}
        >
          <option value="dog">Dog</option>
          <option value="cat">Cat</option>
          <option value="bird">Bird</option>
          <option value="fish">Fish</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="breed">Breed</label>
        <input
          id="breed"
          name="breed"
          type="text"
          value={formData.breed}
          onChange={handleChange}
          placeholder="Enter breed (optional)"
        />
      </div>

      <div className="form-group">
        <label htmlFor="age">Age (years)</label>
        <input
          id="age"
          name="age"
          type="number"
          min="0"
          max="50"
          value={formData.age}
          onChange={handleChange}
        />
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={createPet.isPending}
        >
          {createPet.isPending ? 'Creating...' : 'Create Pet'}
        </button>
      </div>

      {createPet.error && (
        <div className="error">
          Failed to create pet: {createPet.error.message}
        </div>
      )}
    </form>
  );
}
