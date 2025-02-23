import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SeoProps {
  title: string;
  description: string;
  keywords: string;
  name: string;
  type: string;
  address: string;
}

const Seo: React.FC<SeoProps> = ({ title, description, keywords, name, type, address }) => {
  const baseUrl = import.meta.env.VITE_FRONTEND_URL!;
  return (
    <Helmet>
      <title>{title} | Stream</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={(baseUrl + address)} />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />

      <meta name="twitter:creator" content={name} />
      <meta name="twitter:card" content={type} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
};

export default Seo;