import { useListPets } from '../generated';
import type { Pet, PetStatus } from '../generated';

interface PetListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const speciesEmoji: Record<string, string> = {
  dog: '🐕',
  cat: '🐱',
  bird: '🐦',
  fish: '🐟',
  other: '🐾',
};

const statusClass: Record<PetStatus, string> = {
  available: 'status-available',
  pending: 'status-pending',
  sold: 'status-sold',
};

export function PetList({ selectedId, onSelect }: PetListProps) {
  const { data: pets, isLoading, error, refetch } = useListPets({
    query: { limit: 20 },
  });

  if (isLoading) {
    return <div className="loading">Loading pets...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>Failed to load pets: {error.message}</p>
        <button className="btn btn-secondary" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  if (!pets || pets.length === 0) {
    return (
      <div className="empty-state">
        <p>No pets found. Add one to get started!</p>
      </div>
    );
  }

  return (
    <div className="pet-list">
      {pets.map((pet: Pet) => (
        <div
          key={pet.id}
          className={`pet-card ${selectedId === pet.id ? 'selected' : ''}`}
          onClick={() => onSelect(pet.id)}
        >
          <span className="pet-emoji">
            {speciesEmoji[pet.species ?? 'other'] ?? '🐾'}
          </span>
          <div className="pet-info">
            <h3>{pet.name}</h3>
            <p>
              {pet.breed ?? pet.species ?? 'Unknown'} • {pet.age ?? '?'} years
            </p>
          </div>
          <span className={`status-badge ${statusClass[pet.status]}`}>
            {pet.status}
          </span>
        </div>
      ))}
    </div>
  );
}
