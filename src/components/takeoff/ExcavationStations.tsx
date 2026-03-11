'use client';

import React, { useState, useEffect } from 'react';
import type { ScheduleItem } from '@/types';

interface ExcavationStationsProps {
  projectId: string;
}

interface Station {
  id: string;
  station: string; // e.g., "0+000", "0+020"
  chainage: number; // meters from start
  area: number; // cross-sectional area in m²
  notes?: string;
}

interface CatalogItem {
  itemNumber: string;
  description: string;
  unit: string;
  category: string;
  trade: string;
}

export default function ExcavationStations({ projectId }: ExcavationStationsProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [selectedDpwhItem, setSelectedDpwhItem] = useState<CatalogItem | null>(null);
  const [showAddStation, setShowAddStation] = useState(false);
  const [savedToDatabase, setSavedToDatabase] = useState(false);
  
  // Form state for new station
  const [newStation, setNewStation] = useState({
    station: '',
    chainage: '',
    area: '',
    notes: '',
  });

  useEffect(() => {
    loadCatalogItems();
  }, [projectId]);

  useEffect(() => {
    if (catalogItems.length > 0) {
      loadStations();
    }
  }, [projectId, catalogItems]);

  const loadStations = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule-items?category=earthworks-excavation`);
      if (res.ok) {
        const data = await res.json();
        const items = data.scheduleItems || [];
        
        // Parse stations from stored items
        const stationData = items
          .filter((item: ScheduleItem) => item.tags?.includes('type:station'))
          .map((item: ScheduleItem) => {
            const stationTag = item.tags?.find((t: string) => t.startsWith('station:'));
            const chainageTag = item.tags?.find((t: string) => t.startsWith('chainage:'));
            const areaTag = item.tags?.find((t: string) => t.startsWith('area:'));
            
            return {
              id: item.id,
              station: stationTag?.replace('station:', '') || '',
              chainage: parseFloat(chainageTag?.replace('chainage:', '') || '0'),
              area: parseFloat(areaTag?.replace('area:', '') || '0'),
              notes: item.basisNote || '',
            };
          })
          .sort((a: Station, b: Station) => a.chainage - b.chainage);
        
        setStations(stationData);
        
        // Load selected DPWH item if exists
        const dpwhItemRecord = items.find((item: ScheduleItem) => item.tags?.includes('type:excavation-total'));
        if (dpwhItemRecord && catalogItems.length > 0) {
          const catalogItem = catalogItems.find(c => c.itemNumber === dpwhItemRecord.dpwhItemNumberRaw);
          if (catalogItem) {
            setSelectedDpwhItem(catalogItem);
            setSavedToDatabase(true);
          }
        }
      }
    } catch (error) {
      console.error('Error loading stations:', error);
    }
  };

  const loadCatalogItems = async () => {
    try {
      const res = await fetch('/api/catalog?limit=5000');
      if (res.ok) {
        const response = await res.json();
        const allResults: CatalogItem[] = response.data || response || [];
        
        // Filter to excavation items (Part C - 800 series)
        const excavationItems = allResults.filter(item =>
          (item.trade === 'Earthwork' || item.itemNumber.startsWith('8')) &&
          (item.description?.toLowerCase().includes('excavation') ||
           item.description?.toLowerCase().includes('roadway'))
        );
        
        excavationItems.sort((a, b) => a.itemNumber.localeCompare(b.itemNumber));
        setCatalogItems(excavationItems);
      }
    } catch (error) {
      console.error('Error loading catalog:', error);
    }
  };

  const handleAddStation = () => {
    if (!newStation.station || !newStation.chainage || !newStation.area) {
      alert('Please fill in Station, Chainage, and Area');
      return;
    }

    const station: Station = {
      id: `temp-${Date.now()}`,
      station: newStation.station,
      chainage: parseFloat(newStation.chainage),
      area: parseFloat(newStation.area),
      notes: newStation.notes,
    };

    setStations([...stations, station].sort((a, b) => a.chainage - b.chainage));
    setNewStation({ station: '', chainage: '', area: '', notes: '' });
    setShowAddStation(false);
    setSavedToDatabase(false);
  };

  const handleDeleteStation = (id: string) => {
    setStations(stations.filter(s => s.id !== id));
    setSavedToDatabase(false);
  };

  // Calculate volumes using Average Area Method
  const calculateVolumes = () => {
    if (stations.length < 2) return [];
    
    const volumes = [];
    for (let i = 0; i < stations.length - 1; i++) {
      const sta1 = stations[i];
      const sta2 = stations[i + 1];
      const distance = sta2.chainage - sta1.chainage; // meters
      const avgArea = (sta1.area + sta2.area) / 2; // m²
      const volume = avgArea * distance; // m³
      
      volumes.push({
        from: sta1.station,
        to: sta2.station,
        distance,
        area1: sta1.area,
        area2: sta2.area,
        avgArea,
        volume,
      });
    }
    
    return volumes;
  };

  const getTotalVolume = () => {
    const volumes = calculateVolumes();
    return volumes.reduce((sum, v) => sum + v.volume, 0);
  };

  const handleSaveToDatabase = async () => {
    if (!selectedDpwhItem) {
      alert('Please select a DPWH item first');
      return;
    }

    if (stations.length < 2) {
      alert('Please add at least 2 stations to calculate volume');
      return;
    }

    try {
      // Delete existing excavation records
      const existingRes = await fetch(`/api/projects/${projectId}/schedule-items?category=earthworks-excavation`);
      if (existingRes.ok) {
        const data = await existingRes.json();
        const items = data.scheduleItems || [];
        
        for (const item of items) {
          await fetch(`/api/projects/${projectId}/schedule-items/${item.id}`, {
            method: 'DELETE',
          });
        }
      }

      // Save each station as a record
      for (const station of stations) {
        const res = await fetch(`/api/projects/${projectId}/schedule-items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: 'earthworks-excavation',
            dpwhItemNumberRaw: selectedDpwhItem.itemNumber,
            descriptionOverride: `Station data: ${station.station}`,
            unit: selectedDpwhItem.unit, // Use catalog unit
            qty: station.area,
            basisNote: station.notes || `Cross-sectional area at ${station.station}`,
            tags: [
              'type:station',
              `station:${station.station}`,
              `chainage:${station.chainage}`,
              `area:${station.area}`,
            ],
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          console.error('Failed to save station:', error);
          alert(`Failed to save station ${station.station}: ${error.error || 'Unknown error'}`);
          return;
        }
      }

      // Save the total volume as the main excavation record
      const totalVolume = getTotalVolume();
      const volumeRes = await fetch(`/api/projects/${projectId}/schedule-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'earthworks-excavation',
          dpwhItemNumberRaw: selectedDpwhItem.itemNumber,
          descriptionOverride: selectedDpwhItem.description,
          unit: selectedDpwhItem.unit,
          qty: totalVolume,
          basisNote: `Average Area Method: ${stations.length} stations from ${stations[0].station} to ${stations[stations.length - 1].station}`,
          tags: ['type:excavation-total', `stations:${stations.length}`],
        }),
      });

      if (!volumeRes.ok) {
        const error = await volumeRes.json();
        console.error('Failed to save total volume:', error);
        alert(`Failed to save total volume: ${error.error || 'Unknown error'}`);
        return;
      }

      setSavedToDatabase(true);
      alert('Excavation data saved successfully!');
      
      // Reload catalog first, then stations
      await loadCatalogItems();
      await loadStations();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save excavation data');
    }
  };

  const volumes = calculateVolumes();
  const totalVolume = getTotalVolume();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-amber-900 mb-2">⛏️ Excavation - Average Area Method</h2>
        <p className="text-sm text-amber-700 mb-4">
          Calculate excavation volume using cross-sectional areas at different stations
        </p>
        
        {/* DPWH Item Selection */}
        <div>
          <label className="block text-sm font-medium text-amber-800 mb-2">
            Select DPWH Excavation Item *
          </label>
          <select
            value={selectedDpwhItem?.itemNumber || ''}
            onChange={(e) => {
              const item = catalogItems.find(c => c.itemNumber === e.target.value);
              setSelectedDpwhItem(item || null);
              setSavedToDatabase(false);
            }}
            className="w-full max-w-2xl px-3 py-2 border border-amber-300 rounded bg-white"
          >
            <option value="">-- Select excavation type --</option>
            {catalogItems.map((item) => (
              <option key={item.itemNumber} value={item.itemNumber}>
                {item.itemNumber} - {item.description} ({item.unit})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stations Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Stations & Cross-Sectional Areas</h3>
          <button
            onClick={() => setShowAddStation(!showAddStation)}
            className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
          >
            {showAddStation ? 'Cancel' : '+ Add Station'}
          </button>
        </div>

        {/* Add Station Form */}
        {showAddStation && (
          <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Station *
                </label>
                <input
                  type="text"
                  value={newStation.station}
                  onChange={(e) => setNewStation({ ...newStation, station: e.target.value })}
                  placeholder="e.g., 0+000"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chainage (m) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newStation.chainage}
                  onChange={(e) => setNewStation({ ...newStation, chainage: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area (m²) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newStation.area}
                  onChange={(e) => setNewStation({ ...newStation, area: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={newStation.notes}
                  onChange={(e) => setNewStation({ ...newStation, notes: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleAddStation}
                className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
              >
                Add Station
              </button>
            </div>
          </div>
        )}

        {/* Stations List */}
        {stations.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <div className="text-4xl mb-2">📏</div>
            <p>No stations added yet</p>
            <p className="text-sm mt-1">Add at least 2 stations to calculate excavation volume</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Station</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chainage (m)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area (m²)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stations.map((station) => (
                <tr key={station.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{station.station}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{station.chainage.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{station.area.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{station.notes || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleDeleteStation(station.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Volume Calculations */}
      {volumes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Volume Calculations (Average Area Method)</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From Station</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Station</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance (m)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area 1 (m²)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area 2 (m²)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Area (m²)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Volume (m³)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {volumes.map((vol, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{vol.from}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{vol.to}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{vol.distance.toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{vol.area1.toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{vol.area2.toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{vol.avgArea.toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm font-bold text-amber-700">{vol.volume.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-amber-50">
                <td colSpan={6} className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                  TOTAL EXCAVATION VOLUME:
                </td>
                <td className="px-6 py-4 text-lg font-bold text-amber-700">
                  {totalVolume.toFixed(2)} m³
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Save Button */}
      {stations.length >= 2 && selectedDpwhItem && (
        <div className="flex justify-end gap-4 items-center">
          {savedToDatabase && (
            <span className="text-green-600 text-sm font-medium">✓ Saved to database</span>
          )}
          <button
            onClick={handleSaveToDatabase}
            disabled={savedToDatabase}
            className={`px-6 py-3 rounded font-medium ${
              savedToDatabase
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            {savedToDatabase ? 'Saved' : 'Save to Database'}
          </button>
        </div>
      )}

      {/* Formula Reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">📐 Average Area Method Formula</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Volume between two stations:</strong></p>
          <p className="font-mono bg-white px-3 py-2 rounded">V = (A₁ + A₂) / 2 × L</p>
          <p className="text-xs mt-2">
            Where: V = Volume (m³), A₁ & A₂ = Cross-sectional areas at stations (m²), L = Distance between stations (m)
          </p>
        </div>
      </div>
    </div>
  );
}
