import { useNavigate } from 'react-router';
import ErrorResultView from '../components/ErrorResultView';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <ErrorResultView
      status="404"
      statusCode={404}
      title="404 - Page Not Found"
      subTitle="The page or resource you requested could not be located."
      onGoHome={() => navigate('/')}
      onNavigate={(path) => navigate(path)}
      onReload={() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }}
      onSignIn={() => navigate('/login')}
      showQuickLinks={true}
      showDiagnostics={false}
    />
  );
}
