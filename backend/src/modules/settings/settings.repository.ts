import { Injectable } from '@nestjs/common'
import type { Prisma, SystemSettings } from '../../generated/prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

/** Identifier of the only settings row. */
const SETTINGS_ID = 1

/**
 * Data access for the single `SystemSettings` row, which the seed creates.
 */
@Injectable()
export class SettingsRepository {
  /**
   * Creates the repository.
   *
   * @param prisma - Database client.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reads the settings.
   *
   * @returns The settings, or `null` if the row is missing.
   */
  find(): Promise<SystemSettings | null> {
    return this.prisma.systemSettings.findUnique({ where: { id: SETTINGS_ID } })
  }

  /**
   * Changes the settings.
   *
   * @param data - Values to change.
   * @returns The changed settings.
   */
  update(data: Prisma.SystemSettingsUpdateInput): Promise<SystemSettings> {
    return this.prisma.systemSettings.update({ where: { id: SETTINGS_ID }, data })
  }
}
