import {
  avisoColetaAlterada,
  avisoColetaCancelada,
  avisoColetaDisponivel,
  avisoColetaReatribuida,
  avisoNovaColeta,
  quando,
} from './avisos.js';

describe('avisos de notificação', () => {
  const hoje = '2026-09-27';
  const ordem = {
    id: 7,
    dataColeta: hoje,
    enderecoColeta: 'Rua A, 1',
    pesoEstimadoKg: 1234.5,
    cliente: { nome: 'Malharia' },
  };

  it('descreve a data como hoje, amanhã ou dia/mês', () => {
    expect(quando('2026-09-27', hoje)).toBe('hoje');
    expect(quando('2026-09-28', hoje)).toBe('amanhã');
    expect(quando('2026-10-05', hoje)).toBe('em 05/10');
  });

  it('monta o aviso de nova coleta com peso e endereço', () => {
    expect(avisoNovaColeta(ordem, hoje)).toEqual({
      titulo: 'Nova coleta para você',
      corpo: 'Malharia, hoje · cerca de 1.235 kg\nRua A, 1',
      url: '/motorista',
      tag: 'ordem-7',
    });
  });

  it('convida todos os motoristas para uma coleta disponível', () => {
    expect(avisoColetaDisponivel(ordem, hoje)).toEqual({
      titulo: 'Coleta disponível: quem pega?',
      corpo: 'Malharia, hoje · cerca de 1.235 kg\nRua A, 1',
      url: '/motorista',
      tag: 'ordem-7',
    });
  });

  it('avisa o motorista quando a coleta dele muda de data ou de endereço', () => {
    expect(avisoColetaAlterada(ordem, hoje)).toEqual({
      titulo: 'Coleta alterada',
      corpo: 'Malharia, hoje · cerca de 1.235 kg\nRua A, 1',
      url: '/motorista',
      tag: 'ordem-7',
    });
  });

  it('avisa o motorista que perdeu a coleta para outro, substituindo o aviso anterior', () => {
    expect(avisoColetaReatribuida(ordem, hoje)).toEqual({
      titulo: 'Coleta passou para outro motorista',
      corpo: 'Malharia, hoje',
      url: '/motorista',
      tag: 'ordem-7',
    });
  });

  it('omite o peso quando ele não foi informado', () => {
    const semPeso = {
      ...ordem,
      pesoEstimadoKg: null,
      dataColeta: '2026-09-28',
    };
    expect(avisoNovaColeta(semPeso, hoje).corpo).toBe(
      'Malharia, amanhã\nRua A, 1',
    );
  });

  it('usa a mesma tag no cancelamento para substituir o aviso anterior', () => {
    expect(avisoColetaCancelada(ordem, hoje, 'Cliente desistiu')).toEqual({
      titulo: 'Coleta cancelada',
      corpo: 'Malharia, hoje: Cliente desistiu',
      url: '/motorista',
      tag: avisoNovaColeta(ordem, hoje).tag,
    });
  });
});
