import { AlbumPage } from '../types/album';

export const SAMPLE_ALBUM_PAGES: AlbumPage[] = [
  {
    id: 'sample-1',
    imageUrl: '/src/assets/images/sample_morning_cafe_1795738783125.jpg',
    fileName: 'morning_window_coffee.jpg',
    title: '창가의 첫 모금',
    description:
      '오래된 나무 창틀 너머로 햇살이 스며들던 아침. 식탁 위에 놓인 도자기 잔과 리넨 노트 사이로 하루의 온기가 조용히 번져 나갔다.',
    width: 1200,
    height: 900,
    isSample: true,
  },
  {
    id: 'sample-2',
    imageUrl: '/src/assets/images/sample_coastal_walk_1795738782465.jpg',
    fileName: 'coastal_cliff_trail.jpg',
    title: '바람이 머무는 해안길',
    description:
      '물안개가 낮게 깔린 늦은 오후, 억새풀 사이로 난 좁은 오솔길을 걸었다. 수평선 끝으로 번지는 금빛 노을이 긴 하루를 천천히 닫아주었다.',
    width: 1200,
    height: 900,
    isSample: true,
  },
  {
    id: 'sample-3',
    imageUrl: '/src/assets/images/sample_botanical_shadow_1795738782766.jpg',
    fileName: 'courtyard_olive_shadow.jpg',
    title: '올리브 나무와 오후의 그림자',
    description:
      '거친 회벽 위로 드리워진 나뭇잎의 윤곽이 시간의 흐름을 그려냈다. 아무 말 없이 앉아만 있어도 충분했던 작은 중정의 고요한 한낮.',
    width: 1200,
    height: 900,
    isSample: true,
  },
];
