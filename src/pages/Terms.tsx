import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'

export default function Terms() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Regulamin</h1>
        <p className="text-sm text-slate-400 mt-1">
          Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <Card>
        <div className="prose-content">

          <p>
            Prosimy o uważne zapoznanie się z niniejszym Regulaminem
            (&quot;Regulamin&quot;) przed rozpoczęciem korzystania z
            LibreBudget (&quot;Aplikacja&quot;, &quot;Usługa&quot;). Uzyskując dostęp do
            Aplikacji lub korzystając z niej, akceptujesz postanowienia niniejszego
            Regulaminu. Jeśli się z nimi nie zgadzasz, nie korzystaj z Aplikacji.
          </p>

          <h2>1. Akceptacja Regulaminu</h2>
          <p>
            Korzystając z LibreBudget, potwierdzasz, że przeczytałeś, zrozumiałeś
            i akceptujesz niniejszy Regulamin oraz naszą{' '}
            <Link to="/privacy" className="text-green-400 hover:text-green-300">
              Politykę prywatności
            </Link>
            , która stanowi jego integralną część.
          </p>

          <h2>2. Opis Usługi</h2>
          <p>
            LibreBudget to bezpłatna aplikacja typu open source do zarządzania
            budżetem osobistym, oparta na <strong>architekturze zero-knowledge
            (bez wiedzy serwera)</strong>. Udostępnia narzędzia do śledzenia
            przychodów, wydatków, celów budżetowych, długów, celów oszczędnościowych,
            transakcji cyklicznych, trendów wydatków oraz postępów w realizacji
            planu finansowego. Domyślnie dane są przechowywane lokalnie w Twojej
            przeglądarce. Opcjonalna kopia zapasowa w chmurze korzysta z sejfu
            (frazy odzyskiwania) i szyfruje dane w Twojej przeglądarce przed
            wysłaniem; nie jesteśmy w stanie odczytać Twoich danych. Aplikacja
            jest dostarczana jako progresywna aplikacja webowa (PWA), która działa
            w trybie offline.
          </p>

          <h2>3. Zero-knowledge i kontrola nad danymi</h2>
          <p>
            LibreBudget stosuje szyfrowanie od końca do końca dla opcjonalnej kopii
            zapasowej w chmurze. Twoje dane są szyfrowane kluczami pochodzącymi z
            Twojej frazy odzyskiwania. Nie jesteśmy w stanie odszyfrować, uzyskać
            dostępu ani odzyskać Twoich danych finansowych. Jeśli utracisz frazę
            odzyskiwania, nie będziemy mogli przywrócić zaszyfrowanych kopii
            zapasowych. Ponosisz wyłączną odpowiedzialność za ochronę swojej frazy
            odzyskiwania oraz utrzymywanie własnych kopii zapasowych (poprzez
            eksport). Przechowuj frazę w kilku bezpiecznych miejscach. Szczegóły
            znajdziesz w naszym{' '}
            <Link to="/privacy-manifesto" className="text-green-400 hover:text-green-300">
              Manifeście prywatności
            </Link>
            .
          </p>

          <h2>4. To NIE jest doradztwo finansowe</h2>
          <p>
            <strong>
              Aplikacja jest wyłącznie narzędziem do prowadzenia ewidencji i
              wizualizacji danych. Żadne treści w LibreBudget nie stanowią
              doradztwa finansowego, inwestycyjnego, podatkowego, prawnego ani
              jakiejkolwiek innej formy profesjonalnego doradztwa.
            </strong>{' '}
            Kategorie (&quot;potrzeby&quot;, &quot;zachcianki&quot;, &quot;oszczędności&quot;) oraz plan
            finansowy są ogólnymi klasyfikacjami stworzonymi dla wygody. W sprawach
            dotyczących Twoich finansów skonsultuj się z wykwalifikowanym doradcą
            finansowym.
          </p>

          <h2>5. Obowiązki użytkownika</h2>
          <ul>
            <li>
              <strong>Dokładność danych:</strong> Ponosisz odpowiedzialność za
              dokładność i kompletność wprowadzanych danych. Nie weryfikujemy ich.
            </li>
            <li>
              <strong>Bezpieczeństwo frazy odzyskiwania:</strong> Zachowaj poufność
              swojej frazy odzyskiwania. Przechowuj ją w kilku bezpiecznych
              miejscach; nie polegaj na pojedynczej kopii (np. w schowku lub w
              jednym menedżerze haseł).
            </li>
            <li>
              <strong>Blokada sejfu:</strong> Zablokowanie sejfu usuwa dane lokalne.
              Twoja fraza odzyskiwania to jedyny sposób na przywrócenie danych. Nie
              możemy odzyskać utraconych fraz.
            </li>
            <li>
              <strong>Zgodne z prawem korzystanie:</strong> Korzystaj z Aplikacji
              wyłącznie w celach zgodnych z prawem i obowiązującymi przepisami.
            </li>
            <li>
              <strong>Odpowiedzialność za kopie zapasowe:</strong> Regularnie
              eksportuj swoje dane. Udostępniamy eksport oraz opcjonalną kopię
              zapasową w chmurze; to Ty odpowiadasz za własną strategię tworzenia
              kopii zapasowych.
            </li>
          </ul>

          <h2>6. Wyłączenie gwarancji</h2>
          <p>
            <strong>
              APLIKACJA JEST DOSTARCZANA &quot;W STANIE, W JAKIM SIĘ ZNAJDUJE&quot; ORAZ
              &quot;W MIARĘ DOSTĘPNOŚCI&quot;, BEZ JAKICHKOLWIEK GWARANCJI, WYRAŹNYCH,
              DOROZUMIANYCH, USTAWOWYCH CZY INNYCH, W TYM GWARANCJI PRZYDATNOŚCI
              HANDLOWEJ, PRZYDATNOŚCI DO OKREŚLONEGO CELU, NIENARUSZALNOŚCI PRAW,
              DOKŁADNOŚCI ANI NIEPRZERWANEJ DOSTĘPNOŚCI.
            </strong>
          </p>
          <p>Nie gwarantujemy, że:</p>
          <ul>
            <li>Aplikacja spełni Twoje wymagania.</li>
            <li>Aplikacja będzie dostępna przez cały czas lub wolna od błędów.</li>
            <li>Obliczenia, podsumowania lub wizualizacje będą wolne od błędów.</li>
            <li>Wady zostaną usunięte lub że Aplikacja jest wolna od szkodliwych komponentów.</li>
          </ul>

          <h2>7. Ograniczenie odpowiedzialności</h2>
          <p>
            <strong>
              W MAKSYMALNYM ZAKRESIE DOZWOLONYM PRZEZ PRAWO NIE PONOSIMY
              ODPOWIEDZIALNOŚCI ZA JAKIEKOLWIEK SZKODY POŚREDNIE, UBOCZNE,
              SPECJALNE, WYNIKOWE, ODSZKODOWANIA O CHARAKTERZE KARNYM LUB
              ODSTRASZAJĄCYM, W TYM ZA UTRATĘ ZYSKÓW, RENOMY, DANYCH LUB INNE
              STRATY NIEMATERIALNE.
            </strong>
          </p>
          <p>
            <strong>
              NASZA CAŁKOWITA ŁĄCZNA ODPOWIEDZIALNOŚĆ NIE PRZEKROCZY KWOTY, KTÓRĄ
              ZAPŁACIŁEŚ NAM W CIĄGU DWUNASTU MIESIĘCY POPRZEDZAJĄCYCH ROSZCZENIE,
              LUB ZERA (0,00 ZŁ), JEŚLI NIC NAM NIE ZAPŁACIŁEŚ (CO MA MIEJSCE W
              PRZYPADKU TEJ BEZPŁATNEJ APLIKACJI).
            </strong>
          </p>

          <h2>8. Wyłączenie odpowiedzialności za utratę danych</h2>
          <p>
            <strong>
              Nie ponosimy odpowiedzialności za jakąkolwiek utratę danych,
              niezależnie od jej przyczyny.
            </strong>{' '}
            Dotyczy to utraty danych spowodowanej wyczyszczeniem danych
            przeglądarki, awarią urządzenia, przerwami w działaniu usług
            chmurowych, błędami oprogramowania lub nieautoryzowanym dostępem.
            Zachęcamy do regularnego eksportowania danych oraz przechowywania frazy
            odzyskiwania w kilku bezpiecznych miejscach.
          </p>

          <h2>9. Zwolnienie z odpowiedzialności</h2>
          <p>
            Zobowiązujesz się zwolnić z odpowiedzialności oraz chronić deweloperów,
            współtwórców i operatorów LibreBudget przed wszelkimi roszczeniami,
            szkodami, stratami i wydatkami wynikającymi z korzystania przez Ciebie z
            Aplikacji, naruszenia niniejszego Regulaminu lub z jakichkolwiek decyzji
            finansowych podjętych na podstawie informacji wyświetlanych przez
            Aplikację.
          </p>

          <h2>10. Licencja open source</h2>
          <p>
            Kod źródłowy LibreBudget jest udostępniany na licencji MIT. Niniejszy
            Regulamin dotyczy korzystania z hostowanej Aplikacji oraz jej usług
            (w tym kopii zapasowej w chmurze) i obowiązuje dodatkowo, obok warunków
            licencji MIT.
          </p>

          <h2>11. Kopia zapasowa w chmurze i jej zakończenie</h2>
          <p>
            Dostęp do kopii zapasowej w chmurze może zostać w dowolnym momencie
            zawieszony lub zakończony. W każdej chwili możesz usunąć swoją kopię
            zapasową w chmurze z poziomu Konta. Po usunięciu zaszyfrowane dane
            kopii zapasowej są trwale usuwane. Nie ma to wpływu na dane
            przechowywane lokalnie. Zablokowanie sejfu usuwa dane lokalne, ale nie
            usuwa kopii zapasowej w chmurze; w tym celu skorzystaj z funkcji
            usuwania.
          </p>

          <h2>12. Dostępność Usługi</h2>
          <p>
            Nie udzielamy żadnych gwarancji co do dostępności kopii zapasowej w
            chmurze. Funkcje lokalne działają niezależnie od jakiegokolwiek serwera
            i są dostępne w trybie offline.
          </p>

          <h2>13. Zmiany w Regulaminie</h2>
          <p>
            Możemy w dowolnym momencie zmienić niniejszy Regulamin. Zmiany zostaną
            opublikowane wraz ze zaktualizowaną datą &quot;Ostatnia aktualizacja&quot;.
            Dalsze korzystanie z Aplikacji oznacza akceptację zmian.
          </p>

          <h2>14. Rozdzielność postanowień i całość porozumienia</h2>
          <p>
            Jeśli którekolwiek z postanowień okaże się nieważne lub niewykonalne,
            pozostałe pozostają w mocy. Niniejszy Regulamin oraz Polityka
            prywatności stanowią całość porozumienia między Tobą a LibreBudget.
          </p>

          <h2>15. Prawo właściwe i kontakt</h2>
          <p>
            Niniejszy Regulamin podlega prawu jurysdykcji, w której znajduje się
            operator Aplikacji. W razie pytań utwórz zgłoszenie w repozytorium
            projektu lub skontaktuj się z osobą odpowiedzialną za jego utrzymanie.
          </p>

        </div>
      </Card>

      <p className="text-center text-xs text-slate-500">
        <Link to="/privacy" className="text-green-400 hover:text-green-300">Polityka prywatności</Link>
        {' · '}
        <Link to="/privacy-manifesto" className="text-green-400 hover:text-green-300">Manifest prywatności</Link>
        {' · '}
        <Link to="/settings" className="text-green-400 hover:text-green-300">Powrót do ustawień</Link>
      </p>
    </div>
  )
}
