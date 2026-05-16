import { Public, UserContext, WorkspaceId } from '@/common/decorators/app.decorator';
import { Doc } from '@/common/doc/doc.decorator';
import { GetManyResponseDto } from '@/utils/getManyResponse';
import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from '../auth/entities/user.entity';
import { DeleteResponseDto } from './dto/delete-response.dto';
import {
  GetManySearchHistoryDto,
  GetSearchHistoryResponseDto,
  SearchAssetsTargetsDto,
  SearchResponseDto,
} from './dto/search.dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get('syntax')
  getSyntaxHelp() {
    return {
      filters: {
        severity: { syntax: 'severity:critical,high', description: 'Filter by severity level' },
        cvss: { syntax: 'cvss:>=9', description: 'CVSS score comparison (>=, <=, >, <, x..y)' },
        epss: { syntax: 'epss:>=0.9', description: 'EPSS probability score' },
        status: { syntax: 'status:open', description: 'Finding status' },
        tool: { syntax: 'tool:nuclei', description: 'Source scanning tool' },
        has: { syntax: 'has:cve', description: 'Presence check (cve, kev, ticket)' },
        age: { syntax: 'age:<7', description: 'Age in days (< = newer than)' },
        port: { syntax: 'port:6274', description: 'Port number filter' },
        ip: { syntax: 'ip:10.0.0.0/24', description: 'IP address or CIDR range' },
        subdomain: { syntax: 'subdomain:*.example.com', description: 'Subdomain pattern' },
        cve: { syntax: 'cve:CVE-2024-3400', description: 'CVE identifier' },
        cat: { syntax: 'cat:mcp', description: 'Finding category' },
      },
      examples: [
        'severity:critical has:cve',
        'tool:nuclei cvss:>=9 status:open',
        'age:<7 severity:critical,high',
        'cve:CVE-2024-3400',
        'ip:10.0.0.0/24 port:443',
      ],
      negation: 'Prefix any filter with - to negate: -severity:info',
    };
  }

  @Doc({
    summary: 'Search assets and targets',
    description: 'Search assets and targets',
    response: {
      serialization: SearchResponseDto,
    },
    request: {
      getWorkspaceId: true,
    },
  })
  @Get()
  searchAssetsTargets(
    @UserContext() user: User,
    @Query() query: SearchAssetsTargetsDto,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.searchService.searchAssetsTargets(user, query, workspaceId);
  }

  @Doc({
    summary: 'Get search history',
    description: 'Get search history',
    response: {
      serialization: GetManyResponseDto(GetSearchHistoryResponseDto),
    },
  })
  @Get('histories')
  getSearchHistory(
    @UserContext() user: User,
    @Query() query: GetManySearchHistoryDto,
  ) {
    return this.searchService.getSearchHistory(user, query);
  }

  @Doc({
    summary: 'Delete search history by ID',
    description: 'Delete a specific search history entry by its ID',
    response: {
      serialization: DeleteResponseDto,
    },
  })
  @Delete('histories/:id')
  deleteSearchHistory(@UserContext() user: User, @Param('id') id: string) {
    return this.searchService.deleteSearchHistory(user, id);
  }

  @Doc({
    summary: 'Delete all search history',
    description: 'Delete all search history entries for the user',
    response: {
      serialization: DeleteResponseDto,
    },
  })
  @Delete('histories')
  deleteAllSearchHistories(@UserContext() user: User) {
    return this.searchService.deleteAllSearchHistories(user);
  }
}
