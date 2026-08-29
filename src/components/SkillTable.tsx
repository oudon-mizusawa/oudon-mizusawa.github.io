'use client';

import { useMemo, useState } from 'react';
import type { Skill } from '@/lib/items';

/**
 * 履歴書のスキル欄。
 *
 * 言語 / DB / OS と分けて表を並べると、どこに何があるか探すことになるので、
 * 1 枚の表に全部入れてカテゴリで絞れるようにする。
 * カテゴリのボタンは表の中身から作るので、行を足すだけで増える。
 */
export default function SkillTable({ skills }: { skills: Skill[] }) {
  const [active, setActive] = useState<string | null>(null);

  // 出てきた順にカテゴリを並べる。Set を使うと重複が落ちて順序は保たれる
  const categories = useMemo(
    () => [...new Set(skills.map((s) => s.category))],
    [skills],
  );

  const visible = useMemo(
    () => (active ? skills.filter((s) => s.category === active) : skills),
    [skills, active],
  );

  return (
    <div className="skills">
      <div className="skills__filter">
        <button
          type="button"
          className={active === null ? 'skills__pill is-on' : 'skills__pill'}
          onClick={() => setActive(null)}
        >
          ぜんぶ<span className="skills__count">{skills.length}</span>
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={active === c ? 'skills__pill is-on' : 'skills__pill'}
            // もう一度押したら解除。行き止まりを作らない
            onClick={() => setActive(active === c ? null : c)}
          >
            {c}
            <span className="skills__count">
              {skills.filter((s) => s.category === c).length}
            </span>
          </button>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th>カテゴリ</th>
            <th>経験</th>
            <th>技術</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((s) => (
            <tr key={s.category + s.name}>
              <td>{s.category}</td>
              <td>{s.experience}</td>
              <td>{s.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
