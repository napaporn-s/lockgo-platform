import { describe, it, expect, beforeEach } from 'bun:test';
import { stationService } from '../../src/modules/station/station.service';
import { db } from '../../src/core/database';

describe('Station & Compartment Service', () => {
  beforeEach(() => {
    db.reset();
  });

  it('should fetch all registered stations', () => {
    const stations = stationService.getAllStations();
    expect(stations.length).toBeGreaterThan(0);
    expect(stations[0].stationCode).toBe('BKK-ASOKE-01');
  });

  it('should calculate distance and find nearby stations using geospatial coordinates', () => {
    // BTS Asoke coordinates: 13.7371, 100.5604
    // User at Terminal 21 (nearby: 13.7378, 100.5602)
    const nearby = stationService.searchNearbyStations({ latitude: 13.7378, longitude: 100.5602 }, 1.0);
    expect(nearby.length).toBe(1);
    expect(nearby[0].stationCode).toBe('BKK-ASOKE-01');
    expect(nearby[0].distanceKm).toBeLessThan(0.5);
  });

  it('should filter available compartments by size tier', () => {
    const mediumComps = stationService.getAvailableCompartments('station-asoke-01', { sizeTier: 'M' });
    expect(mediumComps.length).toBeGreaterThan(0);
    expect(mediumComps.every(c => c.sizeTier === 'M')).toBe(true);
  });
});
