import { useState } from 'react';
import { ActionIcon, Box, Button, FileButton, Group, Image, Stack, Text, TextInput } from '@mantine/core';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { uploadImage } from '../services/catalog.service.js';
import { notifyError } from '../utils/notify.js';

/**
 * Campo de imagen: subir un archivo desde el computador o pegar una URL.
 * El valor siempre es una URL (/uploads/… o https://…).
 */
export default function ImageInput({ label = 'Imagen', value, onChange }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      notifyError('La imagen supera 3 MB');
      return;
    }
    setUploading(true);
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      notifyError(err, 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Stack gap={6}>
      <Text size="sm" fw={500}>
        {label}
      </Text>
      <Group align="flex-start" wrap="nowrap">
        <Box
          w={96}
          h={96}
          style={{
            flexShrink: 0,
            borderRadius: 'var(--mantine-radius-md)',
            overflow: 'hidden',
            border: '1px solid var(--mantine-color-default-border)',
            display: 'grid',
            placeItems: 'center',
            background: 'var(--mantine-color-default-hover)',
          }}
        >
          {value ? <Image src={value} alt="" w={96} h={96} fit="cover" /> : <IconPhoto size={32} color="var(--mantine-color-dimmed)" />}
        </Box>
        <Stack gap={6} style={{ flex: 1 }}>
          <Group gap="xs">
            <FileButton onChange={handleFile} accept="image/png,image/jpeg,image/webp,image/gif">
              {(props) => (
                <Button {...props} variant="light" leftSection={<IconUpload size={16} />} loading={uploading}>
                  Subir imagen
                </Button>
              )}
            </FileButton>
            {value && (
              <ActionIcon variant="subtle" color="red" onClick={() => onChange(null)} aria-label="Quitar imagen">
                <IconX size={16} />
              </ActionIcon>
            )}
          </Group>
          <TextInput
            size="xs"
            placeholder="…o pega la URL de una imagen"
            value={value ?? ''}
            onChange={(e) => onChange(e.currentTarget.value || null)}
          />
          <Text size="xs" c="dimmed">
            JPG, PNG o WEBP · máximo 3 MB
          </Text>
        </Stack>
      </Group>
    </Stack>
  );
}
