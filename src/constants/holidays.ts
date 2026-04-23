import { addDays, getYear, startOfYear } from 'date-fns';

export interface Holiday {
  date: Date;
  name: string;
  type: 'holiday' | 'commemorative';
}

function getEaster(year: number): Date {
  const f = Math.floor,
    G = year % 19,
    C = f(year / 100),
    H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
    I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
    J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
    L = I - J,
    month = 3 + f((L + 40) / 44),
    day = L + 28 - 31 * f(month / 4);

  return new Date(year, month - 1, day);
}

export function getBrazilianHolidays(year: number): Holiday[] {
  const easter = getEaster(year);
  const carnival = addDays(easter, -47);
  const goodFriday = addDays(easter, -2);
  const corpusChristi = addDays(easter, 60);

  const holidays: Holiday[] = [
    { date: new Date(year, 0, 1), name: 'Confraternização Universal', type: 'holiday' },
    { date: carnival, name: 'Carnaval', type: 'holiday' },
    { date: goodFriday, name: 'Sexta-feira Santa', type: 'holiday' },
    { date: new Date(year, 3, 21), name: 'Tiradentes', type: 'holiday' },
    { date: new Date(year, 4, 1), name: 'Dia do Trabalho', type: 'holiday' },
    { date: corpusChristi, name: 'Corpus Christi', type: 'holiday' },
    { date: new Date(year, 8, 7), name: 'Independência do Brasil', type: 'holiday' },
    { date: new Date(year, 9, 12), name: 'Nossa Senhora Aparecida', type: 'holiday' },
    { date: new Date(year, 10, 2), name: 'Finados', type: 'holiday' },
    { date: new Date(year, 10, 15), name: 'Proclamação da República', type: 'holiday' },
    { date: new Date(year, 10, 20), name: 'Consciência Negra', type: 'holiday' },
    { date: new Date(year, 11, 25), name: 'Natal', type: 'holiday' },
    
    // Commemorative Dates
    { date: new Date(year, 2, 8), name: 'Dia da Mulher', type: 'commemorative' },
    { date: new Date(year, 3, 19), name: 'Dia dos Povos Indígenas', type: 'commemorative' },
    { date: new Date(year, 5, 12), name: 'Dia dos Namorados', type: 'commemorative' },
    { date: new Date(year, 9, 15), name: 'Dia dos Professores', type: 'commemorative' },
    { date: new Date(year, 9, 28), name: 'Dia do Servidor Público', type: 'commemorative' },
    { date: new Date(year, 11, 31), name: 'Véspera de Ano Novo', type: 'commemorative' },
  ];

  // Mother's Day (2nd Sunday of May)
  let mothersDay = new Date(year, 4, 1);
  while (mothersDay.getDay() !== 0) mothersDay.setDate(mothersDay.getDate() + 1);
  mothersDay.setDate(mothersDay.getDate() + 7);
  holidays.push({ date: mothersDay, name: 'Dia das Mães', type: 'commemorative' });

  // Father's Day (2nd Sunday of August)
  let fathersDay = new Date(year, 7, 1);
  while (fathersDay.getDay() !== 0) fathersDay.setDate(fathersDay.getDate() + 1);
  fathersDay.setDate(fathersDay.getDate() + 7);
  holidays.push({ date: fathersDay, name: 'Dia dos Pais', type: 'commemorative' });

  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}
