import FindIdForm from './FindIdForm';

export const metadata = {
  title: '아이디 찾기 | LIONE',
  description: '가입 시 입력한 정보를 기반으로 아이디(이메일)를 확인하세요.',
};

export default function FindIdPage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50 py-12">
      <div className="px-4">
        <FindIdForm />
      </div>
    </div>
  );
}
