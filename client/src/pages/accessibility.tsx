import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Accessibility() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Accessibility Statement
          </h1>
          <p className="text-muted-foreground">Last updated: January 3, 2026</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Our Commitment</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                MediVault Healthcare is committed to ensuring digital
                accessibility for people with disabilities. We are continually
                improving the user experience for everyone and applying the
                relevant accessibility standards to ensure we provide equal
                access to all our users.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conformance Status</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                We strive to conform to the Web Content Accessibility Guidelines
                (WCAG) 2.1 Level AA standards. These guidelines explain how to
                make web content more accessible for people with disabilities
                and user-friendly for everyone.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visual Accessibility</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li>
                  <strong>High Contrast Mode:</strong> Dark and light themes for
                  better readability
                </li>
                <li>
                  <strong>Scalable Text:</strong> All text can be resized up to
                  200% without loss of functionality
                </li>
                <li>
                  <strong>Color Contrast:</strong> Sufficient contrast ratios
                  for text and interactive elements
                </li>
                <li>
                  <strong>Focus Indicators:</strong> Clear visual indicators for
                  keyboard navigation
                </li>
                <li>
                  <strong>Alternative Text:</strong> Descriptive alt text for
                  all images and icons
                </li>
                <li>
                  <strong>No Color-Only Information:</strong> Information is not
                  conveyed by color alone
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Keyboard Accessibility</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li>
                  <strong>Full Keyboard Navigation:</strong> All features
                  accessible via keyboard
                </li>
                <li>
                  <strong>Logical Tab Order:</strong> Sequential and intuitive
                  focus order
                </li>
                <li>
                  <strong>Skip Navigation Links:</strong> Quick access to main
                  content
                </li>
                <li>
                  <strong>Keyboard Shortcuts:</strong> Standard shortcuts for
                  common actions
                </li>
                <li>
                  <strong>No Keyboard Traps:</strong> Users can navigate freely
                  without getting stuck
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Screen Reader Support</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li>
                  <strong>ARIA Labels:</strong> Proper labeling for interactive
                  elements
                </li>
                <li>
                  <strong>Semantic HTML:</strong> Correct heading structure and
                  landmarks
                </li>
                <li>
                  <strong>Form Labels:</strong> All form inputs properly labeled
                </li>
                <li>
                  <strong>Status Messages:</strong> Screen reader announcements
                  for dynamic content
                </li>
                <li>
                  <strong>Compatible with:</strong> JAWS, NVDA, VoiceOver, and
                  TalkBack
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Motor Accessibility</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li>
                  <strong>Large Click Targets:</strong> Buttons and links sized
                  for easy interaction
                </li>
                <li>
                  <strong>Sufficient Spacing:</strong> Adequate spacing between
                  interactive elements
                </li>
                <li>
                  <strong>No Time Limits:</strong> Sufficient time to complete
                  actions
                </li>
                <li>
                  <strong>Error Prevention:</strong> Confirmations for important
                  actions
                </li>
                <li>
                  <strong>Multiple Input Methods:</strong> Touch, mouse, and
                  keyboard support
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Responsive Design</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li>
                  <strong>Mobile Friendly:</strong> Optimized for all screen
                  sizes
                </li>
                <li>
                  <strong>Portrait & Landscape:</strong> Works in all
                  orientations
                </li>
                <li>
                  <strong>Zoom Support:</strong> Content reflows properly when
                  zoomed
                </li>
                <li>
                  <strong>Touch Gestures:</strong> Standard gestures for mobile
                  interaction
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Clarity</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li>
                  <strong>Plain Language:</strong> Clear and simple language
                </li>
                <li>
                  <strong>Consistent Navigation:</strong> Predictable interface
                  throughout
                </li>
                <li>
                  <strong>Error Messages:</strong> Clear, helpful error messages
                </li>
                <li>
                  <strong>Instructions:</strong> Step-by-step guidance for
                  complex tasks
                </li>
                <li>
                  <strong>Abbreviations:</strong> Expanded on first use
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Known Limitations</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>Despite our best efforts, some limitations may exist:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Some third-party embedded content may not be fully accessible
                </li>
                <li>
                  Certain complex medical charts may require additional
                  assistance
                </li>
                <li>
                  Scanned documents may not be screen-reader friendly (we're
                  working on this)
                </li>
              </ul>
              <p className="mt-4">
                We are actively working to address these limitations in future
                updates.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assistive Technologies</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                Our platform is designed to work with the following assistive
                technologies:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Screen readers (JAWS, NVDA, VoiceOver, TalkBack)</li>
                <li>Screen magnification software</li>
                <li>Speech recognition software</li>
                <li>Alternative input devices</li>
                <li>Browser accessibility features</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feedback & Support</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                We welcome your feedback on the accessibility of MediVault
                Healthcare. If you encounter any accessibility barriers or have
                suggestions for improvement, please let us know:
              </p>
              <div className="mt-4 space-y-1 not-prose text-sm text-muted-foreground">
                <p>
                  <strong>Email:</strong> accessibility@medivault.com
                </p>
                <p>
                  <strong>Phone:</strong> +94 76 914 6080
                </p>
                <p>
                  <strong>Address:</strong> 123 Healthcare Ave, Medical City
                </p>
              </div>
              <p className="mt-4">
                We aim to respond to accessibility feedback within 5 business
                days.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ongoing Efforts</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>Accessibility is an ongoing effort. We regularly:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Conduct accessibility audits and testing</li>
                <li>Train our team on accessibility best practices</li>
                <li>Update our platform based on user feedback</li>
                <li>
                  Stay current with accessibility standards and guidelines
                </li>
                <li>
                  Work with users with disabilities to improve their experience
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
