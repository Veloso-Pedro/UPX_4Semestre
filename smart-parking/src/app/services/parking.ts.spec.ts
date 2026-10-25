import { TestBed } from '@angular/core/testing';
import { ParkingTs } from './parking.ts';

describe('ParkingTs', () => {
  let service: ParkingTs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ParkingTs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
