import { ChampionData, ChampionPosition } from "@/types/game";

// 챔피언 ID별 주 포지션 정의
const championPositions: Record<string, ChampionPosition[]> = {
  // 탑 챔피언
  Aatrox: ["탑"],
  Darius: ["탑"],
  Fiora: ["탑"],
  Garen: ["탑"],
  Irelia: ["탑", "미드"],
  Jax: ["탑"],
  Kennen: ["탑"],
  Malphite: ["탑"],
  Mordekaiser: ["탑"],
  Nasus: ["탑"],
  Ornn: ["탑"],
  Renekton: ["탑"],
  Riven: ["탑"],
  Sett: ["탑"],
  Shen: ["탑"],
  Singed: ["탑"],
  Sion: ["탑"],
  Teemo: ["탑"],
  Tryndamere: ["탑"],
  Urgot: ["탑"],
  Volibear: ["탑", "정글"],
  Yorick: ["탑"],

  // 정글 챔피언
  Amumu: ["정글"],
  Diana: ["정글", "미드"],
  Ekko: ["정글", "미드"],
  Elise: ["정글"],
  Evelynn: ["정글"],
  Fiddlesticks: ["정글"],
  Graves: ["정글"],
  Hecarim: ["정글"],
  JarvanIV: ["정글"],
  Karthus: ["정글"],
  Kayn: ["정글"],
  KhaZix: ["정글"],
  Kindred: ["정글"],
  LeeSin: ["정글"],
  Lillia: ["정글"],
  MasterYi: ["정글"],
  Nidalee: ["정글"],
  Nocturne: ["정글"],
  Nunu: ["정글"],
  Olaf: ["정글"],
  Rammus: ["정글"],
  RekSai: ["정글"],
  Rengar: ["정글"],
  Sejuani: ["정글"],
  Shaco: ["정글"],
  Shyvana: ["정글"],
  Skarner: ["정글"],
  Taliyah: ["정글", "미드"],
  Trundle: ["정글"],
  Udyr: ["정글"],
  Vi: ["정글"],
  Viego: ["정글"],
  Warwick: ["정글"],
  XinZhao: ["정글"],
  Zac: ["정글"],

  // 미드 챔피언
  Ahri: ["미드"],
  Akali: ["미드"],
  Anivia: ["미드"],
  Annie: ["미드"],
  AurelionSol: ["미드"],
  Azir: ["미드"],
  Cassiopeia: ["미드"],
  Corki: ["미드"],
  Fizz: ["미드"],
  Galio: ["미드"],
  Kassadin: ["미드"],
  Katarina: ["미드"],
  LeBlanc: ["미드"],
  Lissandra: ["미드"],
  Lux: ["미드", "서폿"],
  Malzahar: ["미드"],
  Neeko: ["미드"],
  Orianna: ["미드"],
  Qiyana: ["미드"],
  Ryze: ["미드"],
  Sylas: ["미드"],
  Syndra: ["미드"],
  Talon: ["미드"],
  TwistedFate: ["미드"],
  Veigar: ["미드"],
  Vex: ["미드"],
  Viktor: ["미드"],
  Vladimir: ["미드"],
  Xerath: ["미드"],
  Yasuo: ["미드"],
  Yone: ["미드"],
  Zed: ["미드"],
  Ziggs: ["미드"],
  Zoe: ["미드"],

  // 원딜 챔피언
  Aphelios: ["원딜"],
  Ashe: ["원딜"],
  Caitlyn: ["원딜"],
  Draven: ["원딜"],
  Ezreal: ["원딜"],
  Jhin: ["원딜"],
  Jinx: ["원딜"],
  KaiSa: ["원딜"],
  Kalista: ["원딜"],
  KogMaw: ["원딜"],
  Lucian: ["원딜"],
  MissFortune: ["원딜"],
  Samira: ["원딜"],
  Sivir: ["원딜"],
  Tristana: ["원딜"],
  Twitch: ["원딜"],
  Varus: ["원딜"],
  Vayne: ["원딜"],
  Xayah: ["원딜"],
  Zeri: ["원딜"],

  // 서폿 챔피언
  Alistar: ["서폿"],
  Bard: ["서폿"],
  Blitzcrank: ["서폿"],
  Brand: ["서폿"],
  Braum: ["서폿"],
  Janna: ["서폿"],
  Karma: ["서폿"],
  Leona: ["서폿"],
  Lulu: ["서폿"],
  Morgana: ["서폿"],
  Nami: ["서폿"],
  Nautilus: ["서폿"],
  Pyke: ["서폿"],
  Rakan: ["서폿"],
  Senna: ["서폿"],
  Seraphine: ["서폿"],
  Sona: ["서폿"],
  Soraka: ["서폿"],
  Swain: ["서폿"],
  Taric: ["서폿"],
  Thresh: ["서폿"],
  Yuumi: ["서폿"],
  Zilean: ["서폿"],
  Zyra: ["서폿"],
};

// 모든 포지션 목록 반환
export const getAllPositions = (): ChampionPosition[] => {
  return ["탑", "정글", "미드", "원딜", "서폿"];
};

// 챔피언의 주 포지션 반환
export const getChampionPositions = (
  championId: string
): ChampionPosition[] => {
  return championPositions[championId] || [];
};

// 챔피언이 특정 포지션을 갈 수 있는지 확인
export const canPlayPosition = (
  championId: string,
  position: ChampionPosition
): boolean => {
  return getChampionPositions(championId).includes(position);
};
