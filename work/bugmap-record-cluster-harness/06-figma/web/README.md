# 마커 선택 화면 웹 검증용 시안

390 × 844의 두 상태에서 05 디자인 시스템의 좌표·문구·벡터를 재사용한다. 글꼴, 개별 사진, 지도 벡터와 로고는 로컬 파일에서 불러온다. [사진·글꼴 출처](../../05-design-system/asset-sources.md)

- [3건](main-map--cluster-selected.html)
- [7건](main-map--cluster-selected-overflow.html)
- [정확히 4건](main-map--cluster-selected-overflow.html?records=4)은 7건 화면에 같은 목록과 행 크기를 적용하고 예시 데이터의 처음 네 건을 보여 준다.

제목과 닫기는 스크롤 컨테이너 바깥에 있다. 목록 행을 누르면 화면이 기록 ID를 받고 `bugmap:record` 이벤트를 보낸다. 네이티브 지도 진입·닫기·상세의 검증 범위는 Figma와 제품 문서에 기록한다.

저장소 루트에서 웹 시안을 재생성하고 Chrome에서 조작을 재현할 수 있다. 조작 검사는 7건과 4건에서 시작·끝 PNG와 기록 ID를 기록한다.

```sh
node work/bugmap-record-cluster-harness/06-figma/cli/prepare-web.mjs
node work/bugmap-record-cluster-harness/06-figma/cli/check-web-scroll.mjs
```
