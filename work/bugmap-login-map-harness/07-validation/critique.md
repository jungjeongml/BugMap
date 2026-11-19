# 05 로그인 검증 독립 비평

> 현재 판정 ready (검증 시안에 차단/중요 발견 없음). PNG 5장 직접 시각 확인, source node info 두 파일과 실제 stage5 역사 증거 동일, 47노드 직렬화 SHA 88451e84…, raw tree 대 scan 102개의 고유 ID+type exact, source PNG 원본/최신 71cd76a4… byte exact, 대상 7:2 기준·preflight 보고 hash 일치 확인. 최신 대상 7:2 응답 원문은 입력 묶음에서 없어 기록 SHA 37fbe9a9…을 확인했고 remoteFileKey null, get_node_tree 미지원, 런타임 동작 미실행은 남은 한계. 검증 보고서의 대비는 지도 PNG 위에서 육안 범위라는 점을 한 문장 명시하면 더 명확합니다.

검토 판정은 사람의 하네스 리뷰나 승인을 대신하지 않는다. [원본 비교](../06-figma/preservation/source-compatible-report.json) · [검증 보고서](report.md)

> 정확성에 관한 경미한 문구 수정 1건 추가. `issues.csv` V-01의 ‘전체 레이어 ID와 유형’은 ‘PRD 원시 트리에 있던 102개 레이어의 ID·유형’으로 바꾸면 좋겠습니다. 실제 `scan_nodes_by_types` 호출은 기준 트리의 6개 유형만 요청하고, 브리지 순회는 숨김 노드를 건너뜁니다. 두 집합 102개는 정확히 일치하므로 요구 판정은 여전히 ready이며, 원시 전체 미확인 한계와 잘 맞습니다. 승인→Figma RGB >16 차이 13,345px(4.054259%)도 독립 재계산했고 HTML 픽셀 동일을 재확인했습니다.
