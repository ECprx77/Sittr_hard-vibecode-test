import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { CheckIcon, MessageIcon, PhoneIcon, ShieldIcon } from '../components/Icons';
import { buildSearchParams, formatPhone, smsHref, telHref } from '../lib/format';

export function HomePage() {
  const navigate = useNavigate();
  const { config } = useAuth();
  const [place, setPlace] = useState('');
  const phone = formatPhone(config.supportPhone);
  const permanenceSms = smsHref(
    config.supportPhone,
    'Bonjour, j’ai besoin d’aide avec Sittr.',
  );

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = buildSearchParams({ place, maxRate: '', day: '', when: '' });
    navigate(`/recherche?${params.toString()}`);
  }

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow">Parents et baby-sitters</p>
            <h1>Trouver une baby-sitter de confiance, près de chez vous.</h1>
            <p className="lead">
              Des profils clairs, un contact direct par SMS, et une permanence si vous avez
              besoin d’aide.
            </p>
            <form className="search-panel" onSubmit={onSearch} role="search">
              <label htmlFor="home-place">Ville ou code postal</label>
              <div className="search-row">
                <input
                  id="home-place"
                  name="q"
                  value={place}
                  onChange={(event) => setPlace(event.target.value)}
                  autoComplete="address-level2"
                  placeholder="Lyon ou 69003"
                />
                <button className="btn btn-primary" type="submit">
                  Rechercher
                </button>
              </div>
            </form>
            <div className="cta-row">
              <Link className="btn btn-primary" to="/recherche">
                Je cherche une baby-sitter
              </Link>
              <Link className="btn btn-secondary" to="/inscription?role=babysitter">
                Je propose mes services
              </Link>
            </div>
          </div>
          <aside className="hero-aside">
            <h2>Comment ça se passe</h2>
            <ol className="steps">
              <li>
                <span>1</span>
                <p>Vous indiquez une ville ou un code postal.</p>
              </li>
              <li>
                <span>2</span>
                <p>Vous lisez le profil, le tarif et les disponibilités.</p>
              </li>
              <li>
                <span>3</span>
                <p>Vous contactez la personne par SMS, directement.</p>
              </li>
            </ol>
          </aside>
        </div>
      </section>

      <section className="wrap section">
        <h2>Simple, et pensé pour rassurer</h2>
        <div className="trust-grid">
          <article className="trust-card">
            <ShieldIcon />
            <h3>Des profils vérifiés</h3>
            <p>
              Le badge « Profil vérifié » est accompagné d’une phrase. La couleur ne suffit
              jamais à elle seule.
            </p>
          </article>
          <article className="trust-card">
            <MessageIcon />
            <h3>Un contact direct</h3>
            <p>Pas de messagerie compliquée. Vous envoyez un SMS, ou une demande courte.</p>
          </article>
          <article className="trust-card">
            <CheckIcon />
            <h3>Peu d’étapes</h3>
            <p>La recherche est ouverte. Le compte ne sert qu’à enregistrer un profil ou une demande.</p>
          </article>
        </div>
      </section>

      <section className="permanence" aria-labelledby="permanence-title">
        <div className="wrap permanence-inner">
          <div>
            <h2 id="permanence-title">Permanence téléphonique</h2>
            <p>Une personne répond tous les jours, de 8 h à 22 h.</p>
            <p className="permanence-phone">{phone}</p>
          </div>
          <div className="cta-row">
            <a className="btn btn-primary" href={telHref(config.supportPhone)}>
              <PhoneIcon />
              Appeler
            </a>
            <a className="btn btn-secondary" href={permanenceSms}>
              <MessageIcon />
              Envoyer un SMS
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
