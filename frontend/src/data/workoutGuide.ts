export interface GuideItem {
  name: string;
  duration: string;
  hint: string;
}

// Calentamiento dinámico previo al entrenamiento (~5-10 min)
export const WARMUP_EXERCISES: GuideItem[] = [
  {
    name: 'Rotaciones de hombro',
    duration: '30 s',
    hint: 'Círculos amplios hacia adelante y hacia atrás, sin peso o con banda ligera.',
  },
  {
    name: 'Dislocaciones con banda',
    duration: '10 rep',
    hint: 'Agarre amplio, pasa la banda por encima de la cabeza y detrás, manteniendo brazos casi rectos.',
  },
  {
    name: 'Gatos-camello',
    duration: '10 rep',
    hint: 'A cuatro patas, alterna arquear y redondear la espalda con cada respiración.',
  },
];

// Estiramientos estáticos post-entreno (30-45 s por lado)
export const STRETCH_EXERCISES: GuideItem[] = [
  {
    name: 'Pecho y hombros en marco',
    duration: '30-45 s',
    hint: 'Brazo en el marco de la puerta, gira el torso suavemente hacia el lado contrario.',
  },
  {
    name: 'Tríceps por encima de la cabeza',
    duration: '30-45 s',
    hint: 'Lleva el codo hacia atrás con la mano opuesta, baja el brazo junto a la cabeza.',
  },
  {
    name: 'Espalda y dorsal cruzado',
    duration: '30-45 s',
    hint: 'Sentado, abraza la rodilla opuesta y gira el torso sin forzar.',
  },
  {
    name: 'Cuádriceps de pie',
    duration: '30-45 s',
    hint: 'Talón al glúteo, mantén las rodillas juntas y el abdomen firme.',
  },
  {
    name: 'Isquiotibiales',
    duration: '30-45 s',
    hint: 'De pie, piernas semiflexionadas, baja el torso hacia los pies sin arquear la espalda.',
  },
  {
    name: 'Gemelos contra pared',
    duration: '30-45 s',
    hint: 'Una pierna atrasada con la punta al frente, empuja la cadera hacia la pared.',
  },
];