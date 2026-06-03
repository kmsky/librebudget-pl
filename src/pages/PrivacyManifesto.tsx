import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'

export default function PrivacyManifesto() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Manifest prywatności i bezpieczeństwa</h1>
        <p className="text-sm text-slate-400 mt-1">
          Architektura zero-knowledge: nie jesteśmy w stanie zobaczyć Twoich danych
        </p>
      </div>

      <Card>
        <div className="prose-content">

          <p>
            LibreBudget opiera się na jednej zasadzie: <strong>dane o Twoich
            pieniądzach należą do Ciebie</strong>. Stosujemy <strong>architekturę
            zero-knowledge (bez wiedzy serwera)</strong> — nie jesteśmy w stanie
            odczytać, analizować ani odzyskać Twoich danych finansowych, nawet gdy
            korzystasz z kopii zapasowej w chmurze. Niniejszy manifest wyjaśnia, jak
            to osiągamy.
          </p>

          <h2>1. Architektura zero-knowledge</h2>
          <p>
            Gdy włączysz kopię zapasową w chmurze, Twoje dane są <strong>szyfrowane
            w Twojej przeglądarce</strong>, zanim ją opuszczą. Używamy
            <strong> AES-256-GCM</strong> z kluczami pochodzącymi z Twojej
            <strong> frazy odzyskiwania</strong> (ziarno BIP39 + HKDF-SHA256). Twoja
            fraza odzyskiwania nigdy nie opuszcza Twojego urządzenia. Przechowujemy
            wyłącznie zaszyfrowany tekst — nieprzejrzysty blok danych. Bez Twojej
            frazy odzyskiwania nikt (włącznie z nami, Cloudflare czy atakującym z
            dostępem do KV) nie jest w stanie odczytać Twoich transakcji, kwot,
            opisów, długów, scoringu kredytowego ani celów.
          </p>
          <p>
            Wskaźniki szyfrowania w Ustawieniach pokazują, które pola są chronione.
            Możesz zweryfikować implementację; kod źródłowy jest otwarty.
          </p>

          <h2>2. Lokalne dane: Twoje urządzenie jest źródłem prawdy</h2>
          <p>
            Domyślnie <strong>nic nie opuszcza Twojej przeglądarki</strong>.
            Transakcje, kategorie, cele budżetowe, długi, cele oszczędnościowe,
            scoring kredytowy, transakcje cykliczne i ustawienia znajdują się w
            bazie IndexedDB na Twoim urządzeniu. Aplikacja działa w pełni offline.
            Kopia zapasowa w chmurze jest opcjonalna — musisz samodzielnie utworzyć
            sejf i ją włączyć. Brak sejfu, brak chmury, brak transmisji.
          </p>

          <h2>3. Czego nigdy nie widzimy</h2>
          <ul>
            <li>Twojej frazy odzyskiwania</li>
            <li>Twoich kluczy szyfrujących</li>
            <li>Odszyfrowanych transakcji, kwot ani opisów</li>
            <li>Celów budżetowych, sald długów ani celów oszczędnościowych</li>
            <li>Scoringu kredytowego ani ocen ryzyka finansowego</li>
            <li>Jakichkolwiek danych mogących ujawnić Twoje wydatki lub przychody</li>
          </ul>

          <h2>4. Dostęp oparty na sejfie</h2>
          <ul>
            <li><strong>Fraza odzyskiwania (BIP39)</strong> — Twoja 12-wyrazowa mnemonika służy do wyprowadzenia anonimowego identyfikatora zasobu oraz klucza szyfrującego. Nigdy nie opuszcza Twojego urządzenia.</li>
            <li><strong>Anonimowe przechowywanie</strong> — Magazyn w chmurze korzysta z wyprowadzonego 64-znakowego identyfikatora szesnastkowego; bez adresu e-mail, hasła i identyfikatorów osobowych.</li>
            <li><strong>Tylko w pamięci</strong> — Klucze sejfu znajdują się w pamięci przeglądarki, dopóki karta jest otwarta. Zablokuj sejf lub zamknij kartę, aby je usunąć.</li>
          </ul>

          <h2>5. Cloudflare Worker i KV</h2>
          <ul>
            <li><strong>Głupia rura (dumb pipe)</strong> — Serwer przechowuje wyłącznie identyfikator + zaszyfrowaną zawartość. Brak logiki odszyfrowywania. Brak przechowywania kluczy.</li>
            <li><strong>Limit zawartości</strong> — Maksymalnie 5 MB na kopię zapasową, aby zapobiec nadużyciom.</li>
            <li><strong>Wyłącznie zaszyfrowany tekst</strong> — Nawet przy dostępie do KV wartości są zaszyfrowanymi blokami danych.</li>
          </ul>

          <h2>6. Zabezpieczenia po stronie klienta</h2>
          <ul>
            <li><strong>Polityka bezpieczeństwa treści (CSP)</strong> — Ogranicza źródła skryptów i cele połączeń.</li>
            <li><strong>Brak analityki i śledzenia</strong> — Brak Google Analytics, Mixpanel czy sieci reklamowych.</li>
            <li><strong>Brak danych osobowych (PII)</strong> — Przy kopii zapasowej w chmurze przechowujemy wyłącznie anonimowy, wyprowadzony identyfikator.</li>
          </ul>

          <h2>7. Dane pod Twoją kontrolą</h2>
          <ul>
            <li><strong>Eksport</strong> — Eksport do formatów JSON i CSV z Ustawień.</li>
            <li><strong>Import</strong> — Ograniczony import CSV z walidacją.</li>
            <li><strong>Reset</strong> — Zablokuj sejf lub usuń kopię zapasową w chmurze, aby usunąć dane z chmury.</li>
            <li><strong>Audyt</strong> — Przeczytaj kod źródłowy; uruchom własną kompilację.</li>
          </ul>

          <h2>8. Czego nie robimy</h2>
          <ul>
            <li>Nie sprzedajemy, nie wynajmujemy ani nie udostępniamy Twoich danych.</li>
            <li>Nie wykorzystujemy Twoich danych do reklam ani profilowania.</li>
            <li>Nie wymagamy kopii zapasowej w chmurze — aplikacja jest użyteczna w pełni offline.</li>
            <li>Nie przechowujemy Twojej frazy odzyskiwania — jeśli ją utracisz, zaszyfrowanych kopii zapasowych nie da się odzyskać (z założenia).</li>
            <li>Nie mamy możliwości odszyfrowania Twoich danych — zero-knowledge wynika z samej architektury.</li>
          </ul>

          <p className="pt-2" style={{ opacity: 0.7 }}>
            LibreBudget jest oprogramowaniem open source. Możesz przeczytać kod,
            uruchomić go samodzielnie i zweryfikować te deklaracje. Prywatność nie
            jest funkcją — jest fundamentem. Zero-knowledge nie jest obietnicą; to
            sposób, w jaki zbudowany jest cały system.
          </p>

        </div>
      </Card>

      <p className="text-center text-xs text-slate-500">
        <Link to="/privacy" className="text-green-400 hover:text-green-300">Polityka prywatności</Link>
        {' · '}
        <Link to="/terms" className="text-green-400 hover:text-green-300">Regulamin</Link>
        {' · '}
        <Link to="/settings" className="text-green-400 hover:text-green-300">Ustawienia</Link>
      </p>
    </div>
  )
}
