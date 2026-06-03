import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'

export default function Privacy() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Polityka prywatności</h1>
        <p className="text-sm text-slate-400 mt-1">
          Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <Card>
        <div className="prose-content">

          <p>
            LibreBudget (&quot;my&quot;, &quot;nas&quot;, &quot;nasz&quot; lub &quot;Aplikacja&quot;) to
            bezpłatna aplikacja typu open source do zarządzania budżetem osobistym.
            Dbamy o ochronę Twojej prywatności. Niniejsza Polityka prywatności
            wyjaśnia, w jaki sposób Twoje informacje są zbierane, wykorzystywane i
            udostępniane podczas korzystania z LibreBudget.
          </p>

          <h2>1. Architektura zero-knowledge</h2>
          <p>
            LibreBudget korzysta z projektu typu <strong>zero-knowledge (bez wiedzy
            serwera)</strong>. Nie jesteśmy w stanie zobaczyć, uzyskać dostępu ani
            odzyskać Twoich danych finansowych — nawet gdy korzystasz z opcjonalnej
            kopii zapasowej w chmurze. Twoje dane są szyfrowane w Twojej
            przeglądarce kluczami pochodzącymi z Twojej frazy odzyskiwania
            (mnemonika BIP39), zanim kiedykolwiek zostaną wysłane. Przechowujemy
            wyłącznie zaszyfrowany tekst; nigdy nie przechowujemy Twojej frazy
            odzyskiwania, kluczy szyfrujących ani żadnego tekstu jawnego. Tylko Ty
            posiadasz klucze.
          </p>

          <h2>2. Lokalne dane (w przeglądarce) jako domyślna zasada</h2>
          <p>
            Domyślnie wszystkie Twoje dane — transakcje, kategorie, cele budżetowe,
            długi, cele oszczędnościowe, scoring kredytowy, transakcje cykliczne i
            ustawienia — są przechowywane w bazie IndexedDB w Twojej przeglądarce,
            na Twoim urządzeniu. <strong>Żadne dane nie są wysyłane na jakikolwiek
            serwer, dopóki samodzielnie nie utworzysz sejfu i nie włączysz kopii
            zapasowej w chmurze.</strong> Aplikacja działa w pełni offline, bez
            konieczności posiadania konta czy sejfu.
          </p>

          <h2>3. Dane, które zbieramy</h2>

          <h3>3.1 Bez sejfu</h3>
          <p>
            Gdy korzystasz z LibreBudget bez utworzenia sejfu, nie zbieramy
            <strong> żadnych danych</strong> na jakimkolwiek serwerze. Wszystkie
            informacje pozostają w Twojej przeglądarce. Nie mamy do nich dostępu.
          </p>

          <h3>3.2 Z sejfem (opcjonalna kopia zapasowa w chmurze)</h3>
          <p>Jeśli utworzysz sejf i będziesz korzystać z kopii zapasowej w chmurze, serwer przechowuje:</p>
          <ul>
            <li>
              <strong>Anonimowy identyfikator zasobu</strong> — 64-znakowy ciąg
              szesnastkowy pochodzący z Twojej frazy odzyskiwania. Identyfikuje on
              Twoją przestrzeń na kopię zapasową, ale nie identyfikuje Ciebie
              osobiście. Sama fraza nigdy nie jest wysyłana ani przechowywana.
            </li>
            <li>
              <strong>Zaszyfrowana zawartość kopii zapasowej</strong> — Twoje dane
              są szyfrowane w Twojej przeglądarce algorytmem AES-256-GCM przed
              wysłaniem. Serwer odbiera i przechowuje wyłącznie zaszyfrowany tekst.
              Nie jesteśmy w stanie go odszyfrować; możesz to zrobić tylko Ty, przy
              użyciu swojej frazy odzyskiwania.
            </li>
          </ul>

          <h3>3.3 Dane, których NIE zbieramy</h3>
          <ul>
            <li>Brak analityki, pikseli śledzących i reklamowych plików cookie.</li>
            <li>Brak adresu e-mail, hasła i identyfikatorów osobowych.</li>
            <li>Brak adresu IP do profilowania.</li>
            <li>Brak odcisków palca urządzenia (fingerprinting).</li>
            <li>Brak sprzedaży, wynajmu czy wymiany danych użytkowników.</li>
            <li>Brak dostępu do Twojej frazy odzyskiwania i kluczy szyfrujących.</li>
          </ul>

          <h2>4. Usługi podmiotów trzecich</h2>
          <p>
            Opcjonalna kopia zapasowa w chmurze korzysta z <strong>Cloudflare
            Workers i KV</strong> jako zaplecza do przechowywania danych. Worker
            działa jak &quot;głupia rura&quot; (dumb pipe): przyjmuje anonimowy
            identyfikator oraz zaszyfrowaną zawartość, przechowuje je i zwraca tę
            zawartość na żądanie. Nie ma żadnej zdolności do odszyfrowania danych i
            nigdy nie widzi Twojej frazy odzyskiwania, kluczy ani danych w postaci
            jawnej. Całe szyfrowanie i wyprowadzanie kluczy odbywa się w Twojej
            przeglądarce.
          </p>

          <h2>5. Bezpieczeństwo danych</h2>
          <ul>
            <li><strong>Szyfrowanie</strong> — AES-256-GCM z kluczami z BIP39 + HKDF. Tekst jawny nigdy nie opuszcza Twojego urządzenia.</li>
            <li><strong>TLS/HTTPS</strong> — Cała transmisja jest szyfrowana.</li>
            <li><strong>Fraza odzyskiwania</strong> — Nigdy nie jest przesyłana. Przechowywana wyłącznie w Twojej pamięci lub tam, gdzie sam zdecydujesz się ją zapisać. Jeśli ją utracisz, nie będziemy mogli odzyskać zaszyfrowanych kopii zapasowych (z założenia).</li>
            <li><strong>Open source</strong> — Kod źródłowy jest dostępny do audytu.</li>
          </ul>

          <h2>6. Przechowywanie i usuwanie danych</h2>
          <ul>
            <li>
              <strong>Dane lokalne:</strong> Usuń je w dowolnym momencie, blokując
              sejf lub czyszcząc dane witryny w przeglądarce. Nie mamy do nich
              dostępu.
            </li>
            <li>
              <strong>Kopia zapasowa w chmurze:</strong> Usuń swoją kopię zapasową w
              chmurze w dowolnym momencie z poziomu Konta. Zaszyfrowane dane są
              trwale usuwane. Nie zachowujemy niczego.
            </li>
          </ul>

          <h2>7. Twoje prawa</h2>
          <p>Masz prawo do:</p>
          <ul>
            <li><strong>Dostępu</strong> do wszystkich swoich danych (eksport JSON/CSV z Ustawień).</li>
            <li><strong>Usunięcia</strong> danych lokalnych i w chmurze w dowolnym momencie.</li>
            <li><strong>Przenoszenia</strong> — eksportuj i przenieś swoje dane w inne miejsce.</li>
            <li><strong>Korzystania bez chmury</strong> — aplikacja jest w pełni użyteczna offline.</li>
            <li><strong>Weryfikacji</strong> — audytu kodu open source.</li>
          </ul>

          <h2>8. Prywatność dzieci</h2>
          <p>
            LibreBudget nie jest skierowany do dzieci poniżej 13. roku życia.
            Świadomie nie zbieramy danych osobowych dzieci poniżej 13. roku życia.
          </p>

          <h2>9. Zmiany w niniejszej Polityce</h2>
          <p>
            Od czasu do czasu możemy aktualizować niniejszą Politykę prywatności.
            Zmiany będą publikowane na tej stronie wraz ze zaktualizowaną datą
            &quot;Ostatnia aktualizacja&quot;. Dalsze korzystanie po wprowadzeniu zmian
            oznacza ich akceptację.
          </p>

          <h2>10. Kontakt</h2>
          <p>
            Masz pytania? Utwórz zgłoszenie w repozytorium projektu lub skontaktuj
            się z osobą odpowiedzialną za jego utrzymanie.
          </p>

        </div>
      </Card>

      <p className="text-center text-xs text-slate-500">
        <Link to="/privacy-manifesto" className="text-green-400 hover:text-green-300">Manifest prywatności i bezpieczeństwa</Link>
        {' · '}
        <Link to="/terms" className="text-green-400 hover:text-green-300">Regulamin</Link>
        {' · '}
        <Link to="/settings" className="text-green-400 hover:text-green-300">Powrót do ustawień</Link>
      </p>
    </div>
  )
}
