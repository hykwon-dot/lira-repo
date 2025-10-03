import ResetPasswordForm from './ResetPasswordForm';

export const metadata = {
  title: '비밀번호 재설정 | LIONE',
  description: '이메일 확인 후 보안 절차를 거쳐 새 비밀번호를 설정하세요.',
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50 py-12">
      <div className="px-4">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
