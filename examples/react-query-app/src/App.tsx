import { useState } from 'react';
import { PetList } from './components/PetList';
import { CreatePetForm } from './components/CreatePetForm';
import { PetDetail } from './components/PetDetail';
import './App.css';

function App() {
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="app">
      <header className="header">
        <h1>🌉 Bridge Pet Store</h1>
        <p>React Query hooks demo with Bridge-generated API client</p>
      </header>

      <main className="main">
        <section className="pets-section">
          <div className="section-header">
            <h2>🐾 Pets</h2>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : '+ Add Pet'}
            </button>
          </div>

          {showCreateForm && (
            <CreatePetForm
              onSuccess={() => setShowCreateForm(false)}
            />
          )}

          <PetList
            selectedId={selectedPetId}
            onSelect={setSelectedPetId}
          />
        </section>

        <section className="detail-section">
          {selectedPetId ? (
            <PetDetail
              petId={selectedPetId}
              onClose={() => setSelectedPetId(null)}
            />
          ) : (
            <div className="empty-state">
              <p>Select a pet to view details</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
