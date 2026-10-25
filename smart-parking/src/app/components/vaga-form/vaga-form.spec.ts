import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VagaForm } from './vaga-form';

describe('VagaForm', () => {
  let component: VagaForm;
  let fixture: ComponentFixture<VagaForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VagaForm],
    }).compileComponents();

    fixture = TestBed.createComponent(VagaForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
