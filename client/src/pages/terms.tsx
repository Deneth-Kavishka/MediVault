import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Terms of Service
          </h1>
          <p className="text-muted-foreground">Last updated: January 3, 2026</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agreement to Terms</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                By accessing and using MediVault Healthcare platform, you agree
                to be bound by these Terms of Service. If you do not agree to
                these terms, please do not use our services.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-2">As a User, You Agree To:</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li>Provide accurate and complete information</li>
                <li>
                  Maintain the confidentiality of your account credentials
                </li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Use the platform only for lawful purposes</li>
                <li>Respect the privacy and rights of other users</li>
                <li>
                  Not share your medical records without proper authorization
                </li>
                <li>Follow your healthcare provider's instructions</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Healthcare Provider Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li>Maintain valid medical licenses and certifications</li>
                <li>Provide accurate medical information and diagnoses</li>
                <li>Follow applicable medical standards and regulations</li>
                <li>Maintain patient confidentiality</li>
                <li>Update availability and schedule information promptly</li>
                <li>Respond to patient communications in a timely manner</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medical Disclaimer</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                <strong>Important:</strong> MediVault is a healthcare management
                platform and does not provide medical advice, diagnosis, or
                treatment. All medical decisions should be made in consultation
                with qualified healthcare professionals.
              </p>
              <ul className="list-disc list-inside space-y-1 mt-4">
                <li>
                  In case of emergency, always call your local emergency
                  services
                </li>
                <li>
                  Do not rely solely on platform communications for urgent
                  medical matters
                </li>
                <li>
                  The platform does not replace in-person medical consultations
                </li>
                <li>
                  Lab results and prescriptions must be reviewed by licensed
                  professionals
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                All content, features, and functionality of MediVault Healthcare
                platform, including but not limited to text, graphics, logos,
                and software, are owned by MediVault and protected by copyright,
                trademark, and other intellectual property laws.
              </p>
              <p className="mt-4">You may not:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Copy, modify, or distribute platform content without
                  permission
                </li>
                <li>Reverse engineer or decompile any software</li>
                <li>Use automated systems to access the platform</li>
                <li>Remove or alter any copyright notices</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prohibited Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li>Impersonating another person or entity</li>
                <li>Sharing false or misleading medical information</li>
                <li>
                  Attempting to gain unauthorized access to any part of the
                  platform
                </li>
                <li>Transmitting viruses or malicious code</li>
                <li>Harassing, threatening, or abusing other users</li>
                <li>Using the platform for illegal activities</li>
                <li>Selling or transferring your account to others</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                To the maximum extent permitted by law, MediVault Healthcare
                shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages resulting from your use or
                inability to use the platform.
              </p>
              <p className="mt-4">We do not guarantee:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Uninterrupted or error-free service</li>
                <li>Accuracy of all information provided by users</li>
                <li>Specific medical outcomes or results</li>
                <li>Compatibility with all devices or browsers</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Termination</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                We reserve the right to suspend or terminate your account if you
                violate these Terms of Service. You may also request account
                deletion at any time, subject to legal retention requirements
                for medical records.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                We may update these Terms of Service from time to time. We will
                notify you of significant changes via email or platform
                notification. Your continued use of the platform after changes
                constitutes acceptance of the updated terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                If you have any questions about these Terms of Service, please
                contact us at:
              </p>
              <div className="mt-4 space-y-1">
                <p>
                  <strong>Email:</strong> legal@medivault.com
                </p>
                <p>
                  <strong>Phone:</strong> +94 76 914 6080
                </p>
                <p>
                  <strong>Address:</strong> 123 Healthcare Ave, Medical City
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
