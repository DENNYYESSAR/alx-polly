'use client';

import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface QRCodeShareProps {
  url: string;
  pollId: string;
}

export default function QRCodeShare({ url, pollId }: QRCodeShareProps) {
  const qrCodeRef = React.useRef<HTMLDivElement>(null);

  const downloadQRCode = () => {
    if (qrCodeRef.current) {
      const canvas = qrCodeRef.current.querySelector('canvas');
      if (canvas) {
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `poll-${pollId}-qrcode.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR Code for this Poll</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <div ref={qrCodeRef}>
          <QRCodeCanvas value={url} size={256} level="H" includeMargin={true} />
        </div>
        <Button onClick={downloadQRCode}>Download QR Code</Button>
      </CardContent>
    </Card>
  );
}
