import { useAuth } from '../auth/AuthContext';
import { MessageIcon, PhoneIcon } from '../components/Icons';
import { formatPhone, smsHref, telHref } from '../lib/format';

export function ContactPage() {
  const { config } = useAuth();
  const phone = formatPhone(config.supportPhone);

  return (
    <div className="wrap section narrow">
      <h1>Contact</h1>
      <p className="lead">
        Une question sur un profil, un compte ou l’utilisation de Sittr ? La permanence vous répond.
      </p>
      <section className="panel">
        <h2>Permanence téléphonique</h2>
        <p>Tous les jours, de 8 h à 22 h.</p>
        <p>Une personne peut vous aider à chercher, à comprendre un profil ou à signaler un problème.</p>
        <p className="permanence-phone">{phone}</p>
        <div className="cta-row">
          <a className="btn btn-primary" href={telHref(config.supportPhone)}>
            <PhoneIcon />
            Appeler
          </a>
          <a
            className="btn btn-secondary"
            href={smsHref(config.supportPhone, 'Bonjour, j’ai besoin d’aide avec Sittr.')}
          >
            <MessageIcon />
            Envoyer un SMS
          </a>
        </div>
      </section>
    </div>
  );
}
