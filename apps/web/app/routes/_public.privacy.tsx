import { Container, Title, List, Text } from "@mantine/core";

export default function Terms() {
  return (
    <Container>
      <Title order={1}>Privacy Policy</Title>
      <Text>
        This Privacy Policy explains how Collide Solutions Inc. ("we," "us," or
        "our") collects, uses, and protects the personally identifiable
        information ("PII") and non-personally identifiable information
        ("non-PII") of users ("you" or "your") in connection with the Divvy.day
        software as a service solutions ("Service"). By using the Service, you
        consent to the collection, use, and disclosure of your PII and non-PII
        as described in this Privacy Policy.
      </Text>
      <Title order={2}>1. Information We Collect</Title>
      <Text>
        1.1 Personally Identifiable Information (PII): As part of the Service,
        we may collect the following PII:
      </Text>
      <List>
        <List.Item>
          Email Address: We collect your email address for the purpose of
          providing the Services and communicating with you.
        </List.Item>
        <List.Item>
          Job Title: We may collect your job title to better understand the
          context of your meeting behaviors and provide more relevant
          recommendations.
        </List.Item>
        <List.Item>
          Company Name: We may collect your company name to tailor the Service
          to your organizational needs and provide aggregated insights to your
          organization, if applicable.
        </List.Item>
        <List.Item>
          Calendar Names and Email Addresses: We collect the names and email
          addresses of the participants of events in your calendar, in order to
          show you insights from your meeting activities. We never use these
          names and email addresses for any other purpose.
        </List.Item>
      </List>
      <Text>
        1.2 Non-Personally Identifiable Information (Non-PII): We also collect
        non-PII related to your use of the Service, including but not limited
        to:
      </Text>
      <List>
        <List.Item>
          Calendar Data: We collect the data and metadata associated with events
          on your calendar.
        </List.Item>
      </List>
      <Title order={2}>2. Use of Information</Title>
      <Text>
        2.1 Service Provision: We use the collected PII, including your email
        address, job title, company name, and manager information, to provide
        you with access to the Service and to communicate with you regarding the
        Service.
      </Text>
      <Text>
        2.2 Analytics and Improvements: We use the non-PII collected, including
        calendar data, to analyze trends, generate statistical insights, and
        improve the Service. This information is used in an aggregated and
        anonymized form, and no personally identifiable information is disclosed
        in the process.
      </Text>
      <Title order={2}>3. Data Retention</Title>
      <Text>
        3.1 User Content: We retain User Content, including calendar data, for
        as long as necessary to provide the Service to you. After this period,
        User Content will no longer be accessible through the Service.
      </Text>
      <Title order={2}>4. Protection of Information</Title>
      <Text>
        4.1 Data Security: We implement reasonable technical and organizational
        measures to protect your PII and non-PII against unauthorized access,
        loss, alteration, or destruction. However, please note that no method of
        transmission over the Internet or electronic storage is 100% secure. We
        cannot guarantee the absolute security of your PII or non-PII.
      </Text>
      <Title order={2}>5. Sharing of Information</Title>
      <Text>
        5.1 Third-Party Service Providers: We may engage third-party service
        providers to assist us in providing the Service. These providers may
        have access to your PII and non-PII only to the extent necessary to
        perform their functions and are obligated to maintain the
        confidentiality and security of your information.
      </Text>
      <Text>
        5.2 Legal Requirements: We may disclose your PII and non-PII if required
        to do so by law or in the good faith belief that such disclosure is
        necessary to comply with legal obligations, protect our rights, prevent
        fraud, or respond to government requests.
      </Text>
      <Title order={2}>6. Cookies and Similar Technologies</Title>
      <Text>
        6.1 Use of Cookies: Collide Solutions Inc. and its partners may use
        cookies or similar technologies to analyze trends, administer the
        website, track users' movements around the website, and gather
        demographic information about our user base as a whole. You can control
        the use of cookies at the individual browser level, but if you choose to
        disable cookies, it may limit your use of certain features or functions
        on our website.
      </Text>
      <Title order={2}>7. Children's Privacy</Title>
      <Text>
        7.1 Age Restriction: The Service is not intended for users under the age
        of 18. We do not knowingly collect personal information from individuals
        under 18 years of age. If we become aware that we have collected
        personal information from an individual under the age of 18, we will
        take steps to delete that information.
      </Text>
      <Title order={2}>8. International Data Transfer</Title>
      <Text>
        8.1 Data Transfer to the United States: By using the Service, you
        understand and consent to the transfer of your PII and non-PII to the
        United States, where our servers are located. The United States may have
        different data protection laws than your country of residence.
      </Text>
      <Title order={2}>9. Changes to the Privacy Policy</Title>
      <Text>
        9.1 We may update this Privacy Policy from time to time to reflect
        changes in our practices or legal obligations. We encourage you to
        review this Privacy Policy periodically for any changes.
      </Text>
      <Title order={2}>10. Contact Us</Title>
      <Text>
        10.1 If you have any questions or concerns about this Privacy Policy or
        our privacy practices, please contact us at{" "}
        <a href="mailto:privacy@letscollide.io">support@letscollide.io</a>.
      </Text>
    </Container>
  );
}
