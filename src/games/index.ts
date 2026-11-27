import type { ComponentType } from 'react';
import type { GameType } from '../core/types';
import type { GameProps } from './types';
import Feud from './Feud';
import { Closest, HigherLower, Price, Risk, TrueFalse, Versus, Year } from './SecretGames';
import { Category, KnowMe, List3, OddOne, Order, Picture, Quiz } from './TurnGames';
import { Association, Describe } from './ClueGames';

/**
 * Registar vrsta igara. Nova vrsta igre dodaje se:
 * 1) tipom pitanja u core/types.ts, 2) validacijom u core/validate.ts,
 * 3) opisom u core/gameInfo.ts, 4) komponentom ovdje.
 */
export const GAME_COMPONENTS: { [K in GameType]: ComponentType<GameProps<K>> } = {
  feud: Feud,
  closest: Closest,
  list3: List3,
  knowme: KnowMe,
  association: Association,
  truefalse: TrueFalse,
  quiz: Quiz,
  order: Order,
  oddone: OddOne,
  describe: Describe,
  higherlower: HigherLower,
  category: Category,
  year: Year,
  risk: Risk,
  price: Price,
  picture: Picture,
  versus: Versus,
};
