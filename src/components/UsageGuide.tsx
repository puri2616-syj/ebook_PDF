import React from 'react';

interface UsageGuideProps {
  guideRef: React.RefObject<HTMLElement | null>;
}

export const UsageGuide: React.FC<UsageGuideProps> = ({ guideRef }) => {
  const steps = [
    {
      num: '01.',
      title: '사진 여러 장 올리기',
      desc: '상단의 사진 올리기 버튼을 누르거나 파일 탐색기에서 여러 장의 사진을 한꺼번에 끌어다 놓으세요. 올린 순서대로 한 쪽에 한 장씩 배치됩니다.',
    },
    {
      num: '02.',
      title: '제목과 설명 기록하기',
      desc: '앨범 페이지의 사진 아래(가로형은 오른쪽)에 있는 제목과 설명 칸을 클릭해 각 사진의 장소, 날짜, 기억을 자유롭게 적어보세요.',
    },
    {
      num: '03.',
      title: '플립북 넘겨보기 및 PDF · EPUB 저장',
      desc: '책장 넘김 효과와 효과음으로 앨범을 넘겨 확인한 뒤, PDF·PNG 이미지 또는 서점 출판용 EPUB 3.0 전자책 파일로 내려받을 수 있습니다.',
    },
  ];

  return (
    <section
      ref={guideRef}
      id="usage-guide"
      className="border-t border-[#E2E5EA] bg-white"
    >
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="mb-8 max-w-2xl">
          <h2 className="font-editorial text-xl font-semibold text-[#111215] text-balance">
            나만의 사진집을 만드는 세 가지 단계
          </h2>
          <p className="text-sm text-[#5B616E] mt-1.5 leading-relaxed">
            모든 사진과 글은 브라우저 안에서만 처리되어 외부 서버로 전송되지
            않습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.num} className="space-y-2">
              <h3 className="text-base font-semibold text-[#111215]">
                <span className="font-tabular text-[#1D4ED8] mr-2">
                  {step.num}
                </span>
                {step.title}
              </h3>
              <p className="text-sm text-[#5B616E] leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        <footer className="mt-12 pt-6 border-t border-[#F0F1F4] flex flex-wrap items-center justify-between gap-4 text-xs text-[#6E7685]">
          <span>모노그래프 포토 앨범 스튜디오</span>
          <span>한 쪽당 사진 1장 · PDF · PNG · EPUB 3.0 전자책 출력 지원</span>
        </footer>
      </div>
    </section>
  );
};
