import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">Last updated: January 3, 2026</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Our Commitment to Privacy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                MediVault Healthcare is committed to protecting your privacy and
                ensuring the security of your personal and medical information.
                This Privacy Policy explains how we collect, use, disclose, and
                safeguard your information when you use our healthcare
                management platform.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Personal Information</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Name, date of birth, contact information</li>
                  <li>Government-issued ID numbers</li>
                  <li>Insurance information</li>
                  <li>Emergency contact details</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Medical Information</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Medical history and records</li>
                  <li>Lab test results</li>
                  <li>Prescriptions and medications</li>
                  <li>Treatment plans and doctor's notes</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Usage Information</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Login credentials and authentication data</li>
                  <li>Platform usage patterns and preferences</li>
                  <li>Communication logs with healthcare providers</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li>Provide and improve healthcare services</li>
                <li>
                  Facilitate communication between patients and healthcare
                  providers
                </li>
                <li>Process appointments, prescriptions, and lab tests</li>
                <li>Ensure platform security and prevent fraud</li>
                <li>Comply with legal and regulatory requirements</li>
                <li>Send important notifications and updates</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Information Sharing</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>We only share your information with:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Healthcare Providers:</strong> Doctors, pharmacists,
                  and lab technicians authorized to access your records
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law or
                  to protect rights and safety
                </li>
                <li>
                  <strong>Service Providers:</strong> Third-party vendors who
                  assist in platform operations (under strict confidentiality
                  agreements)
                </li>
              </ul>
              <p className="mt-4">
                We never sell your personal or medical information to third
                parties.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Rights</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li>Access and review your personal and medical information</li>
                <li>Request corrections to inaccurate information</li>
                <li>
                  Request deletion of your data (subject to legal requirements)
                </li>
                <li>Opt-out of non-essential communications</li>
                <li>Download your medical records</li>
                <li>Control who can access your information</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Security</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>We implement industry-standard security measures including:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>End-to-end encryption for all data transmission</li>
                <li>Secure data storage with regular backups</li>
                <li>Multi-factor authentication</li>
                <li>Regular security audits and penetration testing</li>
                <li>Access controls and audit logs</li>
                <li>HIPAA-compliant data handling practices</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                If you have any questions about this Privacy Policy or our data
                practices, please contact us at:
              </p>
              <div className="mt-4 space-y-1">
                <p>
                  <strong>Email:</strong> privacy@medivault.com
                </p>
                <p>
                  <strong>Phone:</strong> +94 76 914 6080
                </p>
                <p>
                  <strong>Address:</strong> medivault.lk
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
