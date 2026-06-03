import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'

export default function Privacy() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mt-1">
          Last updated: {new Date().toLocaleDateString('pl-PL', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <Card>
        <div className="prose-content">

          <p>
            LibreBudget (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;, or &quot;the Application&quot;) is a free,
            open-source personal budget tracking application. We are committed
            to protecting your privacy. This Privacy Policy explains how your
            information is collected, used, and disclosed when you use
            LibreBudget.
          </p>

          <h2>1. Zero-Knowledge Architecture</h2>
          <p>
            LibreBudget uses a <strong>zero-knowledge</strong> design. We cannot
            see, access, or recover your financial data — even when you use
            optional cloud backup. Your data is encrypted in your browser with
            keys derived from your recovery phrase (BIP39 mnemonic)
            before it is ever sent. We store only ciphertext; we never store
            your recovery phrase, encryption keys, or any plaintext. Only you
            hold the keys.
          </p>

          <h2>2. Local-First by Default</h2>
          <p>
            By default, all of your data — transactions, categories, budget
            goals, debts, savings goals, credit scores, recurring transactions,
            and settings — is stored in your browser&apos;s IndexedDB on your
            device. <strong>No data is sent to any server unless you
            explicitly create a vault and enable cloud backup.</strong> The
            app works fully offline without any account or vault.
          </p>

          <h2>3. Data We Collect</h2>

          <h3>3.1 Without a Vault</h3>
          <p>
            When you use LibreBudget without creating a vault, we collect
            <strong> no data whatsoever</strong> on any server. All information
            remains in your browser. We have no access to it.
          </p>

          <h3>3.2 With a Vault (Optional Cloud Backup)</h3>
          <p>If you create a vault and use cloud backup, the backend stores:</p>
          <ul>
            <li>
              <strong>Anonymous storage ID</strong> — a 64-character hex string
              derived from your recovery phrase. It identifies your backup slot
              but does not identify you personally. The phrase itself is never
              sent or stored.
            </li>
            <li>
              <strong>Encrypted backup payload</strong> — your data is encrypted
              in your browser with AES-256-GCM before upload. The backend
              receives and stores only ciphertext. We cannot decrypt it; only
              you can, with your recovery phrase.
            </li>
          </ul>

          <h3>3.3 Data We Do NOT Collect</h3>
          <ul>
            <li>No analytics, tracking pixels, or advertising cookies.</li>
            <li>No email, password, or personal identifiers.</li>
            <li>No IP address for profiling.</li>
            <li>No device fingerprints.</li>
            <li>No selling, renting, or trading of user data.</li>
            <li>No access to your recovery phrase or encryption keys.</li>
          </ul>

          <h2>4. Third-Party Services</h2>
          <p>
            Optional cloud backup uses <strong>Cloudflare Workers and KV</strong>
            as a storage backend. The Worker is a &quot;dumb pipe&quot;: it accepts
            an anonymous ID and encrypted payload, stores them, and returns the
            payload on request. It has no decryption capability and never sees
            your recovery phrase, keys, or plaintext data. All encryption and
            key derivation happens in your browser.
          </p>

          <h2>5. Data Security</h2>
          <ul>
            <li><strong>Encryption</strong> — AES-256-GCM with keys from BIP39 + HKDF. Plaintext never leaves your device.</li>
            <li><strong>TLS/HTTPS</strong> — All transmission is encrypted.</li>
            <li><strong>Recovery phrase</strong> — Never transmitted. Stored only in your memory or where you choose to back it up. Lose it, and we cannot recover encrypted backups (by design).</li>
            <li><strong>Open source</strong> — Source code is available for audit.</li>
          </ul>

          <h2>6. Data Retention and Deletion</h2>
          <ul>
            <li>
              <strong>Local data:</strong> Delete anytime by locking your vault
              or clearing browser site data. We cannot access it.
            </li>
            <li>
              <strong>Cloud backup:</strong> Delete your cloud backup anytime
              from Account. Encrypted data is permanently removed. We retain
              nothing.
            </li>
          </ul>

          <h2>7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access</strong> all your data (export JSON/CSV from Settings).</li>
            <li><strong>Delete</strong> local and cloud data at any time.</li>
            <li><strong>Portability</strong> — export and take your data elsewhere.</li>
            <li><strong>Use without cloud</strong> — the app is fully useful offline.</li>
            <li><strong>Verify</strong> — audit the open-source code.</li>
          </ul>

          <h2>8. Children&apos;s Privacy</h2>
          <p>
            LibreBudget is not directed at children under 13. We do not
            knowingly collect personal information from children under 13.
          </p>

          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be
            posted on this page with an updated &quot;Last updated&quot; date. Continued
            use after changes constitutes acceptance.
          </p>

          <h2>10. Contact</h2>
          <p>
            Questions? Open an issue on the project&apos;s repository or contact the
            maintainer.
          </p>

        </div>
      </Card>

      <p className="text-center text-xs text-slate-500">
        <Link to="/privacy-manifesto" className="text-green-400 hover:text-green-300">Privacy & Security Manifesto</Link>
        {' · '}
        <Link to="/terms" className="text-green-400 hover:text-green-300">Terms of Use</Link>
        {' · '}
        <Link to="/settings" className="text-green-400 hover:text-green-300">Back to Settings</Link>
      </p>
    </div>
  )
}
