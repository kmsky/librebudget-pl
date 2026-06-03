import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'

export default function Terms() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Terms of Use</h1>
        <p className="text-sm text-slate-400 mt-1">
          Last updated: {new Date().toLocaleDateString('pl-PL', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <Card>
        <div className="prose-content">

          <p>
            Please read these Terms of Use (&quot;Terms&quot;) carefully before using
            LibreBudget (&quot;the Application&quot;, &quot;the Service&quot;). By accessing or
            using the Application, you agree to be bound by these Terms. If you
            do not agree, do not use the Application.
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By using LibreBudget, you acknowledge that you have read, understood,
            and agree to these Terms and our{' '}
            <Link to="/privacy" className="text-green-400 hover:text-green-300">
              Privacy Policy
            </Link>
            , which is incorporated by reference.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            LibreBudget is a free, open-source personal budget tracking
            application with a <strong>zero-knowledge architecture</strong>. It
            provides tools to track income, expenses, budget goals, debts,
            savings goals, recurring transactions, spending trends, and financial
            roadmap progress. Data is stored locally in your browser by default.
            Optional cloud backup uses a vault (recovery phrase) and
            encrypts data in your browser before upload; we cannot read your
            data. The Application is provided as a Progressive Web App (PWA)
            that works offline.
          </p>

          <h2>3. Zero-Knowledge and Data Control</h2>
          <p>
            LibreBudget uses end-to-end encryption for optional cloud backup.
            Your data is encrypted with keys derived from your recovery phrase.
            We cannot decrypt, access, or recover your financial data. If you
            lose your recovery phrase, we cannot restore encrypted backups. You
            are solely responsible for safeguarding your recovery phrase and
            maintaining your own backups (via export). Store your phrase in
            multiple secure locations. See our{' '}
            <Link to="/privacy-manifesto" className="text-green-400 hover:text-green-300">
              Privacy Manifesto
            </Link>{' '}
            for details.
          </p>

          <h2>4. NOT Financial Advice</h2>
          <p>
            <strong>
              The Application is a record-keeping and visualization tool only.
              Nothing in LibreBudget constitutes financial advice, investment
              advice, tax advice, legal advice, or any other form of
              professional advice.
            </strong>{' '}
            Categories (&quot;needs&quot;, &quot;wants&quot;, &quot;savings&quot;) and the financial
            roadmap are general-purpose classifications for convenience. Consult
            a qualified financial advisor for decisions about your finances.
          </p>

          <h2>5. User Responsibilities</h2>
          <ul>
            <li>
              <strong>Data accuracy:</strong> You are responsible for the
              accuracy and completeness of data you enter. We do not verify it.
            </li>
            <li>
              <strong>Recovery phrase security:</strong> Maintain the
              confidentiality of your recovery phrase. Store it in
              multiple secure locations; do not rely on a single copy (e.g.,
              clipboard or one password manager).
            </li>
            <li>
              <strong>Vault lock:</strong> Locking your vault clears local
              data. Your recovery phrase is the only way to restore. We cannot
              recover lost phrases.
            </li>
            <li>
              <strong>Lawful use:</strong> Use the Application only for lawful
              purposes in compliance with applicable laws.
            </li>
            <li>
              <strong>Backup responsibility:</strong> Regularly export your data.
              We provide export and optional cloud backup; you are responsible
              for your own backup strategy.
            </li>
          </ul>

          <h2>6. Disclaimer of Warranties</h2>
          <p>
            <strong>
              THE APPLICATION IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
              WARRANTIES OF ANY KIND, EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE,
              INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              NON-INFRINGEMENT, ACCURACY, OR UNINTERRUPTED AVAILABILITY.
            </strong>
          </p>
          <p>We do not warrant that:</p>
          <ul>
            <li>The Application will meet your requirements.</li>
            <li>The Application will be available at all times or error-free.</li>
            <li>Calculations, summaries, or visualizations are error-free.</li>
            <li>Defects will be corrected or the Application is free of harmful components.</li>
          </ul>

          <h2>7. Limitation of Liability</h2>
          <p>
            <strong>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR
              EXEMPLARY DAMAGES, INCLUDING LOSS OF PROFITS, GOODWILL, DATA, OR
              OTHER INTANGIBLE LOSSES.
            </strong>
          </p>
          <p>
            <strong>
              OUR TOTAL AGGREGATE LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID
              US IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR ZERO DOLLARS ($0.00)
              IF YOU HAVE NOT PAID US ANYTHING (AS IS THE CASE FOR THIS FREE APPLICATION).
            </strong>
          </p>

          <h2>8. Data Loss Disclaimer</h2>
          <p>
            <strong>
              We are not responsible for any loss of data, regardless of cause.
            </strong>{' '}
            This includes data loss from clearing browser data, device failure,
            cloud service outages, bugs, or unauthorized access. You are
            encouraged to regularly export your data and safeguard your recovery
            phrase in multiple secure locations.
          </p>

          <h2>9. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless the developers, contributors,
            and operators of LibreBudget from claims, damages, losses, and
            expenses arising from your use of the Application, violation of these
            Terms, or any financial decisions based on information displayed by
            the Application.
          </p>

          <h2>10. Open-Source License</h2>
          <p>
            LibreBudget&apos;s source code is released under the MIT License. These
            Terms apply to your use of the hosted Application and its services
            (including cloud backup) and are in addition to the MIT License terms.
          </p>

          <h2>11. Cloud Backup and Termination</h2>
          <p>
            Cloud backup access may be suspended or terminated at any time.
            You may delete your cloud backup at any time from Account. Upon
            deletion, encrypted backup data is permanently removed. Locally
            stored data is unaffected. Locking your vault clears local data
            but does not delete cloud backup; use the delete function for that.
          </p>

          <h2>12. Service Availability</h2>
          <p>
            We make no guarantees regarding cloud backup availability. Local
            features function independently of any server and work offline.
          </p>

          <h2>13. Modifications to Terms</h2>
          <p>
            We may modify these Terms at any time. Changes will be posted with an
            updated &quot;Last updated&quot; date. Continued use constitutes acceptance.
          </p>

          <h2>14. Severability and Entire Agreement</h2>
          <p>
            If any provision is invalid or unenforceable, the rest remains in
            effect. These Terms and the Privacy Policy constitute the entire
            agreement between you and LibreBudget.
          </p>

          <h2>15. Governing Law and Contact</h2>
          <p>
            These Terms shall be governed by the laws of the jurisdiction in
            which the Application operator resides. For questions, open an issue
            on the project repository or contact the maintainer.
          </p>

        </div>
      </Card>

      <p className="text-center text-xs text-slate-500">
        <Link to="/privacy" className="text-green-400 hover:text-green-300">Privacy Policy</Link>
        {' · '}
        <Link to="/privacy-manifesto" className="text-green-400 hover:text-green-300">Privacy Manifesto</Link>
        {' · '}
        <Link to="/settings" className="text-green-400 hover:text-green-300">Back to Settings</Link>
      </p>
    </div>
  )
}
