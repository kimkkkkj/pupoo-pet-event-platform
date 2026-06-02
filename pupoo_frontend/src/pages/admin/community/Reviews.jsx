import { Star, ThumbsUp, Edit3, Trash2 } from "lucide-react";
import ds, { statusMap } from "../shared/designTokens";
import { Pill, DataTable, TRow, Td } from "../shared/Components";
import DATA from "../shared/data";

export default function Reviews() {
  const cols = [{ label: "" }, { label: "작성자" }, { label: "행사" }, { label: "평점" }, { label: "내용" }, { label: "작성일" }, { label: "좋아요", align: "right" }, { label: "상태" }, { label: "" }];

  return (
    <DataTable title="커뮤니티 후기" count={DATA.reviews.length} columns={cols} rows={DATA.reviews}
      renderRow={r => {
        const st = statusMap[r.status] || statusMap.active;
        return (
          <TRow key={r.id}>
            <Td><input type="checkbox" style={{ accentColor: ds.brand }} /></Td>
            <Td bold>{r.author}</Td>
            <Td>{r.event}</Td>
            <Td>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={11} color={i < r.rating ? ds.amber : ds.ink4} fill={i < r.rating ? ds.amber : "none"} />
                ))}
              </span>
            </Td>
            <Td><span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{r.content}</span></Td>
            <Td>{r.date}</Td>
            <Td align="right"><span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><ThumbsUp size={11} color={ds.ink4} />{r.likes}</span></Td>
            <Td><Pill color={st.c} bg={st.bg}>{st.l}</Pill></Td>
            <Td>
              <div style={{ display: "flex", gap: 4 }}>
                <Edit3 size={14} color={ds.ink4} style={{ cursor: "pointer" }} />
                <Trash2 size={14} color={ds.red} style={{ cursor: "pointer" }} />
              </div>
            </Td>
          </TRow>
        );
      }}
    />
  );
}
