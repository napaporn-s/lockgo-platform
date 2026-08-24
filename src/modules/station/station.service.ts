/**
 * LOCKGO — Station & Compartment Management Service
 */

import { Station, Compartment, LocationPoint, CompartmentSize, DomainVertical } from '../../core/types';
import { db } from '../../core/database';
import { ResourceNotFoundError } from '../../core/errors';

export class StationService {
  public getAllStations(): Station[] {
    return db.getAllStations();
  }

  public getStationById(id: string): Station {
    const station = db.getStation(id);
    if (!station) {
      throw new ResourceNotFoundError('Station', id);
    }
    return station;
  }

  /**
   * Search stations within radius using Haversine formula (Simulating PostGIS ST_DWithin)
   */
  public searchNearbyStations(userLocation: LocationPoint, maxRadiusKm: number = 10): (Station & { distanceKm: number })[] {
    const stations = db.getAllStations().filter(s => s.status === 'ACTIVE');
    const result: (Station & { distanceKm: number })[] = [];

    for (const station of stations) {
      const distance = this.calculateDistanceKm(userLocation, station.location);
      if (distance <= maxRadiusKm) {
        result.push({
          ...station,
          distanceKm: parseFloat(distance.toFixed(2)),
        });
      }
    }

    return result.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  public getAvailableCompartments(
    stationId: string,
    filter?: { sizeTier?: CompartmentSize; domainVertical?: DomainVertical }
  ): Compartment[] {
    const comps = db.getCompartmentsByStation(stationId);
    return comps.filter(c => {
      if (c.status !== 'AVAILABLE') return false;
      if (filter?.sizeTier && c.sizeTier !== filter.sizeTier) return false;
      if (filter?.domainVertical && c.domainVertical !== filter.domainVertical) return false;
      return true;
    });
  }

  private calculateDistanceKm(p1: LocationPoint, p2: LocationPoint): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(p2.latitude - p1.latitude);
    const dLon = this.deg2rad(p2.longitude - p1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(p1.latitude)) * Math.cos(this.deg2rad(p2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export const stationService = new StationService();
