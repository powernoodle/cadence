import { Container, Title, List, Text } from "@mantine/core";

export default function Terms() {
  return (
    <Container>
      <Title order={1}>Terms of Use</Title>
      These Terms of Use ("Terms") govern your use of the Divvy.day software as
      a service solutions ("Service") provided by Collide Solutions Inc. ("we,"
      "us," or "our"). By accessing or using the Service, you agree to be bound
      by these Terms. If you do not agree with any part of these Terms, you may
      not use the Service.
      <Title order={2}>1. Acceptance of Terms</Title>
      <Text>
        1.1 Agreement to Terms: By accessing or using the Service, you agree to
        be bound by these Terms and any additional terms and conditions that may
        apply to specific features of the Service. If you do not agree with any
        part of these Terms, you may not use the Service.
      </Text>
      <Title order={2}>2. Use of the Service</Title>
      <Text>
        2.1 User Conduct: You agree to use the Service only for lawful purposes
        and in accordance with these Terms. You shall not:
      </Text>
      <List>
        <List.Item>
          Use the Service other than as permitted by these Terms;
        </List.Item>
        <List.Item>Share your login information with any individual;</List.Item>
        <List.Item>
          Use the Service to send, store, publish, post, upload, or otherwise
          transmit any information in violation of any laws, rules, or
          regulations, including those relating to privacy;
        </List.Item>
        <List.Item>
          License, sublicense, sell, resell, rent, lease, transfer, assign,
          distribute, time share, or otherwise commercially exploit or make the
          Service available to any third party;
        </List.Item>
        <List.Item>
          Use the Service to upload, collect, transmit, store, use, or process
          any patient information or other data without the necessary lawful
          right or consent;
        </List.Item>
        <List.Item>
          Use the Service to send, store, publish, post, upload, or otherwise
          transmit any viruses, Trojan horses, worms, time bombs, corrupted
          files, or other computer programming routines that are intended to
          damage, interfere with, or expropriate any systems, data, personal
          information, or property of another;
        </List.Item>
        <List.Item>
          Continue to use the Service in a manner that interferes with or
          disrupts the integrity or performance of the Service following notice
          from Collide Solutions Inc.;
        </List.Item>
        <List.Item>
          Attempt to gain unauthorized access to the Service or its related
          systems or networks;
        </List.Item>
        <List.Item>
          Use or permit the use of any security testing tools to probe, scan, or
          attempt to penetrate the security of the Service;
        </List.Item>
        <List.Item>
          Use any data mining, robots, or similar data gathering or extraction
          methods;
        </List.Item>
        <List.Item>
          Copy, translate, create derivative works of, reverse engineer, reverse
          assemble, disassemble, or decompile the Service or any part thereof,
          except as expressly provided for in these Terms.
        </List.Item>
      </List>
      <Title order={2}>3. User Content and License</Title>
      <Text>
        3.1 User Content Ownership: Collide Solutions Inc. does not claim
        ownership of any User Content created, uploaded, stored, or otherwise
        made available on the Service by you through the use of Divvy.day.
      </Text>
      <Text>
        3.2 License to User Content: By using the Service, you grant Collide
        Solutions Inc. a limited license to collect and store User Content for
        the purpose of providing the Services. You further grant Collide
        Solutions Inc. a perpetual, irrevocable, and unlimited license to use,
        store, and manipulate User Content to create aggregated and anonymized
        statistical analytics in respect to service use and other Services and
        User parameters and characteristics in accordance with the{" "}
        <a href="/privacy">Privacy Policy</a>.
      </Text>
      <Title order={2}>4. Privacy and Data Protection</Title>
      <Text>
        4.1 Personally Identifiable Information (PII): As part of the Service,
        we collect your email address. We are committed to protecting your
        privacy and handling your PII in accordance with applicable data
        protection laws, including the General Data Protection Regulation
        (GDPR). Please refer to our Privacy Policy for detailed information on
        how we collect, use, and protect your PII.
      </Text>
      <Title order={2}>5. Ownership and Intellectual Property</Title>
      <Text>
        5.1 Brand Features: Nothing in the Terms gives you the right to use the
        brand names, trademarks, logos, domain names, and other distinctive
        brand features associated with Divvy.day without our prior written
        consent.
      </Text>
      <Title order={2}>6. Disclaimer and Limitation of Liability</Title>
      <Text>
        6.1 Information and Materials: Any information or materials provided by
        the website and services, including analytics, are for information
        purposes only. Collide Solutions Inc. does not guarantee the
        applicability or effectiveness of any information or materials provided.
        Collide Solutions Inc. expressly disclaims any and all liability or
        responsibility for any loss, harm, injury to person or property,
        illness, damage, or any other claim arising from user reliance on the
        information and materials provided by the website or services.
      </Text>
      <Text>
        6.2 User Content Transmission: You understand that the transmission of
        User Content is necessary to use the Services. Therefore, you expressly
        consent to Collide Solutions Inc. storing User Content, which may
        involve transmission over the Internet and other networks. Collide
        Solutions Inc. has safeguards in place to protect your privacy and
        comply with applicable laws. However, you acknowledge and understand
        that User Content may be accessed by unauthorized persons during
        transmission over public networks not owned or operated by Collide
        Solutions Inc.. Collide Solutions Inc. is not responsible for any
        interference with your use of or access to the Services or security
        breaches arising from or attributable to the Internet. You waive any and
        all claims against Collide Solutions Inc. in connection therewith.
      </Text>
      <Title order={2}>7. Termination</Title>
      <Text>
        7.1 Termination by Collide Solutions Inc.: Collide Solutions Inc.
        retains the right to terminate this Terms of Use and/or your ability to
        access the Services at any time without notice if any of the following
        occur:
      </Text>
      <List>
        <List.Item>
          Material breaches or violations of these Terms of Use;
        </List.Item>
        <List.Item>
          Request by law enforcement or other government agencies;
        </List.Item>
        <List.Item>
          Discontinuance or material modification to the Website and Services;
        </List.Item>
        <List.Item>
          Unexpected technical, security, or legal issues or problems;
        </List.Item>
        <List.Item>
          Participation, directly or indirectly, in fraudulent or illegal
          activities, including falsification of your credentials.
        </List.Item>
      </List>
      <Title order={2}>8. Analytics and Usage Data</Title>
      <Text>
        8.1 Data Collection: Collide Solutions Inc. collects analytics and usage
        data to improve the Services. By using the Services, you agree to the
        collection and use of this data in accordance with our Privacy Policy.
      </Text>
      <Title order={2}>9. Modifications</Title>
      <Text>
        9.1 Modifications to the Terms of Use: Collide Solutions Inc. reserves
        the right to modify or update these Terms at any time without prior
        notice. Any changes will be effective upon posting the revised Terms on
        the Service. Your continued use of the Service after the posting of any
        modifications constitutes your acceptance of the revised Terms.
      </Text>
    </Container>
  );
}
