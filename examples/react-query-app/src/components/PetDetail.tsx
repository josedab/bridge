import { useQueryClient } from '@tanstack/react-query';
import { useGetPet, useDeletePet, queryKeys } from '../generated';

interface PetDetailProps {
  petId: string;
  onClose: () => void;
}

export function PetDetail({ petId, onClose }: PetDetailProps) {
  const queryClient = useQueryClient();

  const { data: pet, isLoading, error } = useGetPet({
    path: { petId },
  });

  const deletePet = useDeletePet({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listPets._def });
      onClose();
    },
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this pet?')) {
      deletePet.mutate({ path: { petId } });
    }
  };

  if (isLoading) {
    return <div className="loading">Loading pet details...</div>;
  }

  if (error) {
    return (
      <div className="error">
        Failed to load pet: {error.message}
      </div>
    );
  }

  if (!pet) {
    return <div className="empty-state">Pet not found</div>;
  }

  return (
    <div className="pet-detail">
      <div className="detail-header">
        <div>
          <h2>{pet.name}</h2>
          <span className={`status-badge status-${pet.status}`}>
            {pet.status}
          </span>
        </div>
        <div className="form-actions">
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={deletePet.isPending}
          >
            {deletePet.isPending ? 'Deleting...' : 'Delete'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-item">
          <label>ID:</label>
          <span>{pet.id}</span>
        </div>
        <div className="detail-item">
          <label>Species:</label>
          <span>{pet.species ?? 'Unknown'}</span>
        </div>
        <div className="detail-item">
          <label>Breed:</label>
          <span>{pet.breed ?? 'Unknown'}</span>
        </div>
        <div className="detail-item">
          <label>Age:</label>
          <span>{pet.age !== undefined ? `${pet.age} years` : 'Unknown'}</span>
        </div>
        {pet.tags && pet.tags.length > 0 && (
          <div className="detail-item">
            <label>Tags:</label>
            <div className="tags">
              {pet.tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        {pet.owner && (
          <>
            <div className="detail-item">
              <label>Owner:</label>
              <span>{pet.owner.name}</span>
            </div>
            <div className="detail-item">
              <label>Email:</label>
              <span>{pet.owner.email}</span>
            </div>
          </>
        )}
        <div className="detail-item">
          <label>Created:</label>
          <span>{new Date(pet.createdAt).toLocaleDateString()}</span>
        </div>
        {pet.updatedAt && (
          <div className="detail-item">
            <label>Updated:</label>
            <span>{new Date(pet.updatedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {deletePet.error && (
        <div className="error">
          Failed to delete pet: {deletePet.error.message}
        </div>
      )}
    </div>
  );
}
