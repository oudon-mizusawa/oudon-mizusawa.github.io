import BackLink from '@/components/BackLink';
import Image from 'next/image';
import { asset } from '@/lib/basePath';
import type { Metadata } from 'next';
import { getRirekisho, getSkills } from '@/lib/content.server';
import Wordmark from '@/components/Wordmark';
import Reveal from '@/components/Reveal';
import SkillTable from '@/components/SkillTable';

export const metadata: Metadata = { title: 'rirekisho — keepSTEEP' };

export default function RirekishoPage() {
  const rirekisho = getRirekisho();
  const skills = getSkills();

  return (
    <div className="sheet">
      <Wordmark />

      <Reveal>
        <article className="article">
          {/* 仕事を頼むか判断するページなので、ここには顔を出す */}
          <header className="who">
            <Image
              src={asset('/avatar.webp')}
              alt="oudon"
              width={700}
              height={700}
              priority
              className="who__avatar"
            />
            <h1 className="article__title article__title--plain who__name">
              {rirekisho?.title ?? 'rirekisho'}
            </h1>
          </header>

          {rirekisho ? (
            <>
              <div
                className="prose prose--rirekisho"
                dangerouslySetInnerHTML={{ __html: rirekisho.intro }}
              />

              {/* 節ごとに罫線の欄で囲って、畳んでおく。
                  紙の履歴書は全部見えているものだが、画面では縦に長くなりすぎる。
                  見出しだけ並べて、見たい欄を開いてもらう形にする。 */}
              {rirekisho.sections.map((s, i) => (
                /* 全部閉じていると開いた瞬間の情報量が無になるので、
                   先頭（基本情報）だけ開けておく */
                <details key={s.heading} className="rireki-box" open={i === 0}>
                  <summary className="rireki-box__head">{s.heading}</summary>
                  <div className="rireki-box__body">
                    <div
                      className="prose prose--rirekisho"
                      dangerouslySetInnerHTML={{ __html: s.html }}
                    />
                    {s.hasSkills && skills.length > 0 && <SkillTable skills={skills} />}
                  </div>
                </details>
              ))}
            </>
          ) : (
            <p className="prose prose--empty">content/rirekisho.md がまだない。</p>
          )}

          <BackLink href="/">← modoru</BackLink>
        </article>
      </Reveal>
    </div>
  );
}
