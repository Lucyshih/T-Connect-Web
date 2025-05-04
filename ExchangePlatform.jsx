import SearchBar from './components/SearchBar';

const ExchangePlatform = () => {
  // ... existing state declarations ...

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ... existing nav code ... */}

      <div className="max-w-6xl mx-auto mt-6 p-4">
        <SearchBar 
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          mapLayers={mapLayers}
          toggleLayer={toggleLayer}
        />

        {/* ... rest of the existing code ... */}
      </div>
    </div>
  );
}; 