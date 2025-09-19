import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalConcluirCadastroComponent } from './modal-concluir-cadastro.component';

describe('ModalConcluirCadastroComponent', () => {
  let component: ModalConcluirCadastroComponent;
  let fixture: ComponentFixture<ModalConcluirCadastroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalConcluirCadastroComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalConcluirCadastroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
