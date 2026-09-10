import { Module } from '@nestjs/common';
import { CredentialVaultService } from './credential-vault.service';
import { NetworkController } from './network.controller';
import { NetworkService } from './network.service';

@Module({
  controllers: [NetworkController],
  providers: [NetworkService, CredentialVaultService],
  exports: [NetworkService, CredentialVaultService],
})
export class NetworkModule {}
