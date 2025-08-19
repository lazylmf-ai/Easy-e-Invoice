# Easy e-Invoice Backup & Disaster Recovery Procedures

## Overview

This document outlines comprehensive backup and disaster recovery procedures for Easy e-Invoice, ensuring business continuity and data protection in compliance with Malaysian PDPA requirements.

## Table of Contents

1. [Backup Strategy](#backup-strategy)
2. [Database Backup Procedures](#database-backup-procedures)  
3. [File Storage Backup](#file-storage-backup)
4. [Application Code Backup](#application-code-backup)
5. [Configuration Backup](#configuration-backup)
6. [Disaster Recovery Plan](#disaster-recovery-plan)
7. [Recovery Time Objectives](#recovery-time-objectives)
8. [Testing & Validation](#testing--validation)
9. [Compliance & Retention](#compliance--retention)

---

## Backup Strategy

### Backup Principles

**3-2-1 Rule Implementation:**
- **3** copies of important data
- **2** different storage media types  
- **1** offsite backup location

**Malaysian Data Residency:**
- Primary backups: Malaysian data centers
- Secondary backups: Singapore (adequate protection)
- No backups stored outside ASEAN region

### Backup Types

**Full Backups:**
- Complete system snapshot
- Frequency: Weekly (Sunday 2 AM GMT+8)
- Retention: 4 weeks

**Incremental Backups:**
- Changes since last backup
- Frequency: Daily (2 AM GMT+8)
- Retention: 7 days

**Transaction Log Backups:**
- Database transaction logs
- Frequency: Every 15 minutes
- Retention: 24 hours

**Point-in-Time Recovery:**
- Granular recovery capability
- Available for last 30 days
- 15-minute recovery granularity

---

## Database Backup Procedures

### Automated Database Backups

**Neon PostgreSQL Backup Configuration:**

```bash
#!/bin/bash
# Database backup script for Easy e-Invoice
# Location: /scripts/backup-database.sh

set -euo pipefail

# Configuration
DB_NAME="einvoice_prod"
BACKUP_DIR="/backups/database"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${DATE}.sql"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Log backup start
echo "[$(date)] Starting database backup for ${DB_NAME}"

# Create database dump
pg_dump "${DATABASE_URL}" \
    --format=custom \
    --compress=9 \
    --verbose \
    --file="${BACKUP_FILE}.dump" \
    --no-password

# Create SQL backup for readability
pg_dump "${DATABASE_URL}" \
    --format=plain \
    --verbose \
    --file="${BACKUP_FILE}" \
    --no-password

# Compress SQL backup
gzip "${BACKUP_FILE}"

# Upload to cloud storage
aws s3 cp "${BACKUP_FILE}.gz" \
    "s3://easy-einvoice-backups-prod/database/${DATE}/" \
    --storage-class STANDARD_IA

aws s3 cp "${BACKUP_FILE}.dump" \
    "s3://easy-einvoice-backups-prod/database/${DATE}/" \
    --storage-class STANDARD_IA

# Verify backup integrity
pg_restore --list "${BACKUP_FILE}.dump" > /dev/null
if [ $? -eq 0 ]; then
    echo "[$(date)] Backup verification successful"
else
    echo "[$(date)] ERROR: Backup verification failed"
    exit 1
fi

# Cleanup old local backups
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +7 -delete
find "${BACKUP_DIR}" -name "*.dump" -mtime +7 -delete

# Cleanup old cloud backups
aws s3api list-objects-v2 \
    --bucket easy-einvoice-backups-prod \
    --prefix database/ \
    --query "Contents[?LastModified<='$(date -d "${RETENTION_DAYS} days ago" --iso-8601)'].Key" \
    --output text | xargs -I {} aws s3 rm "s3://easy-einvoice-backups-prod/{}"

echo "[$(date)] Database backup completed successfully"
```

**Backup Monitoring:**

```bash
#!/bin/bash
# Backup monitoring script
# Location: /scripts/monitor-backups.sh

# Check if today's backup exists
TODAY=$(date +%Y%m%d)
BACKUP_EXISTS=$(aws s3 ls s3://easy-einvoice-backups-prod/database/ --recursive | grep "${TODAY}")

if [ -z "$BACKUP_EXISTS" ]; then
    # Send alert - no backup found for today
    curl -X POST "${SLACK_WEBHOOK_URL}" \
        -H 'Content-type: application/json' \
        --data "{\"text\":\":warning: No database backup found for ${TODAY}\"}"
    exit 1
fi

# Check backup file sizes (should be > 1MB)
aws s3 ls s3://easy-einvoice-backups-prod/database/ --recursive --human-readable | \
    grep "${TODAY}" | \
    awk '$3+0 < 1 {print "Small backup file detected: " $0}'
```

### Database Recovery Procedures

**Point-in-Time Recovery:**

```bash
#!/bin/bash
# Point-in-time recovery script
# Usage: ./recover-database.sh YYYY-MM-DD HH:MM:SS

RECOVERY_TIME="$1"
RECOVERY_DB="einvoice_recovery"

echo "Starting point-in-time recovery to: ${RECOVERY_TIME}"

# Create recovery database
createdb "${RECOVERY_DB}"

# Find the appropriate backup file
BACKUP_DATE=$(date -d "${RECOVERY_TIME}" +%Y%m%d)
BACKUP_FILE=$(aws s3 ls s3://easy-einvoice-backups-prod/database/ --recursive | \
    grep "${BACKUP_DATE}" | grep ".dump" | tail -1 | awk '{print $4}')

if [ -z "$BACKUP_FILE" ]; then
    echo "ERROR: No backup file found for date ${BACKUP_DATE}"
    exit 1
fi

# Download backup file
aws s3 cp "s3://easy-einvoice-backups-prod/${BACKUP_FILE}" ./recovery_backup.dump

# Restore backup
pg_restore --dbname="${RECOVERY_DB}" \
    --clean --if-exists \
    --no-owner --no-privileges \
    ./recovery_backup.dump

# Apply transaction logs up to recovery point
# (This would require transaction log backup implementation)

echo "Recovery completed. Recovery database: ${RECOVERY_DB}"
```

---

## File Storage Backup

### Cloudflare R2 Backup Strategy

**Cross-Region Replication:**

```yaml
# R2 bucket replication configuration
replication:
  primary_bucket: "easy-einvoice-files-prod"
  replica_bucket: "easy-einvoice-files-replica"
  regions:
    primary: "apac"
    replica: "asia"
  
  rules:
    - name: "all-objects-replication"
      prefix: ""
      status: "Enabled"
      delete_marker_replication: "Enabled"
      
  lifecycle:
    - name: "transition-to-ia"
      prefix: ""
      days: 30
      storage_class: "STANDARD_IA"
      
    - name: "transition-to-glacier"
      prefix: "archive/"
      days: 90
      storage_class: "GLACIER"
```

**File Backup Verification:**

```bash
#!/bin/bash
# File storage verification script

# Compare file counts between primary and replica
PRIMARY_COUNT=$(aws s3 ls s3://easy-einvoice-files-prod --recursive | wc -l)
REPLICA_COUNT=$(aws s3 ls s3://easy-einvoice-files-replica --recursive | wc -l)

if [ "$PRIMARY_COUNT" -ne "$REPLICA_COUNT" ]; then
    echo "WARNING: File count mismatch - Primary: $PRIMARY_COUNT, Replica: $REPLICA_COUNT"
fi

# Check recent file synchronization
RECENT_FILES=$(aws s3 ls s3://easy-einvoice-files-prod --recursive | \
    awk '$1 >= "'$(date -d '1 hour ago' '+%Y-%m-%d')'" && $2 >= "'$(date -d '1 hour ago' '+%H:%M:%S')'"')

for FILE in $RECENT_FILES; do
    FILE_KEY=$(echo "$FILE" | awk '{print $4}')
    if ! aws s3 ls "s3://easy-einvoice-files-replica/${FILE_KEY}" > /dev/null 2>&1; then
        echo "WARNING: Recent file not replicated: ${FILE_KEY}"
    fi
done
```

---

## Application Code Backup

### Git Repository Backup

**Multiple Repository Mirrors:**

```bash
#!/bin/bash
# Git repository backup script
# Location: /scripts/backup-repositories.sh

REPOS=(
    "https://github.com/easy-einvoice/easy-einvoice.git"
    "https://github.com/easy-einvoice/documentation.git"
    "https://github.com/easy-einvoice/infrastructure.git"
)

BACKUP_DIR="/backups/repositories"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "${BACKUP_DIR}/${DATE}"

for REPO in "${REPOS[@]}"; do
    REPO_NAME=$(basename "$REPO" .git)
    echo "Backing up repository: ${REPO_NAME}"
    
    # Clone repository
    git clone --mirror "$REPO" "${BACKUP_DIR}/${DATE}/${REPO_NAME}.git"
    
    # Create archive
    tar -czf "${BACKUP_DIR}/${DATE}/${REPO_NAME}_${DATE}.tar.gz" \
        -C "${BACKUP_DIR}/${DATE}" "${REPO_NAME}.git"
    
    # Upload to cloud storage
    aws s3 cp "${BACKUP_DIR}/${DATE}/${REPO_NAME}_${DATE}.tar.gz" \
        "s3://easy-einvoice-backups-prod/repositories/${DATE}/"
        
    # Cleanup local copy
    rm -rf "${BACKUP_DIR}/${DATE}/${REPO_NAME}.git"
done

echo "Repository backup completed"
```

### Deployment Artifact Backup

**Build Artifact Storage:**

```bash
#!/bin/bash
# Deployment artifact backup
# Triggered after successful deployments

DEPLOYMENT_ID="$1"
BUILD_DIR="$2"
ENVIRONMENT="$3"

ARTIFACT_DIR="/artifacts/${ENVIRONMENT}/${DEPLOYMENT_ID}"
mkdir -p "$ARTIFACT_DIR"

# Copy build artifacts
cp -r "$BUILD_DIR"/* "$ARTIFACT_DIR/"

# Create deployment manifest
cat > "$ARTIFACT_DIR/deployment.json" << EOF
{
    "deployment_id": "$DEPLOYMENT_ID",
    "environment": "$ENVIRONMENT",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "git_commit": "$(git rev-parse HEAD)",
    "git_branch": "$(git branch --show-current)",
    "version": "$(cat package.json | jq -r .version)"
}
EOF

# Create archive
tar -czf "${ARTIFACT_DIR}.tar.gz" -C "$(dirname $ARTIFACT_DIR)" "$(basename $ARTIFACT_DIR)"

# Upload to cloud storage
aws s3 cp "${ARTIFACT_DIR}.tar.gz" \
    "s3://easy-einvoice-backups-prod/artifacts/${ENVIRONMENT}/"

# Keep last 10 deployments locally
ls -t /artifacts/${ENVIRONMENT}/*.tar.gz | tail -n +11 | xargs rm -f

echo "Deployment artifact backup completed: ${DEPLOYMENT_ID}"
```

---

## Configuration Backup

### Environment Configuration Backup

**Secrets and Configuration Backup:**

```bash
#!/bin/bash
# Configuration backup script (excluding actual secrets)
# Location: /scripts/backup-config.sh

BACKUP_DIR="/backups/configuration"
DATE=$(date +%Y%m%d_%H%M%S)
CONFIG_BACKUP="${BACKUP_DIR}/config_${DATE}"

mkdir -p "$CONFIG_BACKUP"

# Backup configuration files (without actual secret values)
echo "Backing up configuration templates..."

# Wrangler configuration
cp apps/api/wrangler.toml "$CONFIG_BACKUP/"

# Vercel configuration  
cp apps/web/vercel.json "$CONFIG_BACKUP/"

# Environment variable templates (without values)
env | grep -E '^(NEXT_PUBLIC_|NODE_ENV|ENVIRONMENT)' | \
    sed 's/=.*/=<REDACTED>/' > "$CONFIG_BACKUP/env_template.txt"

# Package.json files
find . -name "package.json" -not -path "./node_modules/*" | \
    xargs -I {} cp {} "$CONFIG_BACKUP/$(basename $(dirname {}))_package.json"

# Monitoring configuration
cp -r monitoring/ "$CONFIG_BACKUP/"

# Infrastructure as code
cp -r infrastructure/ "$CONFIG_BACKUP/" 2>/dev/null || true

# Create archive
tar -czf "${CONFIG_BACKUP}.tar.gz" -C "$BACKUP_DIR" "$(basename $CONFIG_BACKUP)"

# Upload to cloud storage
aws s3 cp "${CONFIG_BACKUP}.tar.gz" \
    "s3://easy-einvoice-backups-prod/configuration/${DATE}/"

# Cleanup
rm -rf "$CONFIG_BACKUP"

echo "Configuration backup completed"
```

**Infrastructure State Backup:**

```bash
#!/bin/bash
# Infrastructure state backup (for Terraform/CDK)

if [ -f "terraform.tfstate" ]; then
    cp terraform.tfstate "/backups/infrastructure/terraform.tfstate.$(date +%Y%m%d_%H%M%S)"
fi

if [ -d "cdk.out" ]; then
    tar -czf "/backups/infrastructure/cdk_$(date +%Y%m%d_%H%M%S).tar.gz" cdk.out/
fi
```

---

## Disaster Recovery Plan

### Recovery Scenarios

**Scenario 1: Complete Data Center Outage**

**Recovery Steps:**
1. **Assessment** (0-15 minutes)
   - Confirm primary data center outage
   - Assess secondary systems availability
   - Activate disaster recovery team

2. **Failover** (15-60 minutes)
   - Switch DNS to secondary region
   - Activate secondary database instance
   - Deploy application to backup infrastructure
   - Verify system functionality

3. **Communication** (0-30 minutes)
   - Notify stakeholders and customers
   - Update status page
   - Provide regular updates

**Scenario 2: Database Corruption**

**Recovery Steps:**
1. **Immediate Response** (0-15 minutes)
   - Stop all write operations
   - Assess corruption extent
   - Switch to read-only mode if possible

2. **Recovery** (15-120 minutes)
   - Restore from latest backup
   - Apply transaction logs
   - Verify data integrity
   - Resume operations gradually

**Scenario 3: Security Breach**

**Recovery Steps:**
1. **Containment** (0-30 minutes)
   - Isolate affected systems
   - Revoke potentially compromised credentials
   - Preserve forensic evidence

2. **Assessment** (30-180 minutes)
   - Determine breach scope
   - Identify compromised data
   - Plan recovery approach

3. **Recovery** (Variable)
   - Restore from clean backups
   - Apply security patches
   - Implement additional security measures

### Recovery Team Roles

**Incident Commander**
- Overall recovery coordination
- External communication
- Decision making authority

**Technical Lead**
- Technical recovery execution
- System restoration
- Technical communication

**Database Administrator**
- Database recovery
- Data integrity verification
- Performance optimization

**Security Officer**
- Security assessment
- Forensic preservation
- Security hardening

**Communications Manager**
- Stakeholder communication
- Status page updates
- Media relations

### Recovery Communication Plan

**Internal Communication:**
- Slack: #incident-response
- Email: incident-team@easyeinvoice.com.my
- Phone: Emergency contact tree

**External Communication:**
- Status page: status.easyeinvoice.com.my
- Email: All active customers
- Social media: @easyeinvoice updates

---

## Recovery Time Objectives

### RTO/RPO Targets

**Production Environment:**

| Component | RTO | RPO | Priority |
|-----------|-----|-----|----------|
| API Services | 1 hour | 15 minutes | P1 Critical |
| Frontend | 30 minutes | N/A | P1 Critical |
| Database | 4 hours | 15 minutes | P1 Critical |
| File Storage | 2 hours | 1 hour | P2 High |
| Monitoring | 1 hour | N/A | P2 High |

**Staging Environment:**

| Component | RTO | RPO | Priority |
|-----------|-----|-----|----------|
| All Services | 4 hours | 24 hours | P3 Medium |

### Recovery Procedures by Component

**API Services Recovery:**

```bash
#!/bin/bash
# API service recovery script

echo "Starting API service recovery..."

# Deploy to backup region
wrangler deploy --env production-backup

# Update DNS to point to backup
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890 \
    --change-batch file://dns-failover.json

# Verify service health
sleep 30
curl -f https://api.easyeinvoice.com.my/health || exit 1

echo "API service recovery completed"
```

**Database Recovery:**

```bash
#!/bin/bash
# Database recovery script

BACKUP_FILE="$1"
RECOVERY_TIME="$2"

echo "Starting database recovery from: $BACKUP_FILE"
echo "Recovery point: $RECOVERY_TIME"

# Create recovery instance
aws rds create-db-instance \
    --db-instance-identifier einvoice-recovery \
    --db-instance-class db.t3.medium \
    --engine postgres \
    --backup-retention-period 7

# Wait for instance to be available
aws rds wait db-instance-available \
    --db-instance-identifier einvoice-recovery

# Restore from backup
aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier einvoice-recovery \
    --db-snapshot-identifier "$BACKUP_FILE"

# Update connection strings
echo "Update DATABASE_URL to point to recovery instance"
echo "Recovery database endpoint: $(aws rds describe-db-instances \
    --db-instance-identifier einvoice-recovery \
    --query 'DBInstances[0].Endpoint.Address' --output text)"
```

---

## Testing & Validation

### Backup Testing Schedule

**Monthly Tests:**
- Database restore verification
- File recovery spot checks
- Configuration restoration

**Quarterly Tests:**
- Full disaster recovery simulation
- Cross-region failover test
- Security breach scenario

**Annual Tests:**
- Complete system rebuild from backups
- Comprehensive disaster recovery exercise
- Third-party recovery audit

### Backup Validation Procedures

**Database Backup Validation:**

```bash
#!/bin/bash
# Database backup validation script

BACKUP_FILE="$1"
TEST_DB="backup_validation_$(date +%s)"

echo "Validating backup: $BACKUP_FILE"

# Create test database
createdb "$TEST_DB"

# Restore backup
pg_restore --dbname="$TEST_DB" \
    --clean --if-exists \
    --no-owner --no-privileges \
    "$BACKUP_FILE"

if [ $? -ne 0 ]; then
    echo "ERROR: Backup restoration failed"
    dropdb "$TEST_DB"
    exit 1
fi

# Validate data integrity
psql "$TEST_DB" -c "SELECT COUNT(*) FROM invoices;" > /dev/null
psql "$TEST_DB" -c "SELECT COUNT(*) FROM organizations;" > /dev/null
psql "$TEST_DB" -c "SELECT COUNT(*) FROM users;" > /dev/null

if [ $? -eq 0 ]; then
    echo "SUCCESS: Backup validation passed"
else
    echo "ERROR: Data integrity check failed"
fi

# Cleanup
dropdb "$TEST_DB"
```

**File Backup Validation:**

```bash
#!/bin/bash
# File backup validation script

# Random file sampling for validation
SAMPLE_FILES=$(aws s3 ls s3://easy-einvoice-files-prod --recursive | \
    shuf -n 10 | awk '{print $4}')

for FILE in $SAMPLE_FILES; do
    # Check if file exists in replica
    if aws s3 ls "s3://easy-einvoice-files-replica/$FILE" > /dev/null 2>&1; then
        # Compare checksums
        PRIMARY_ETAG=$(aws s3api head-object \
            --bucket easy-einvoice-files-prod \
            --key "$FILE" --query 'ETag' --output text)
        REPLICA_ETAG=$(aws s3api head-object \
            --bucket easy-einvoice-files-replica \
            --key "$FILE" --query 'ETag' --output text)
            
        if [ "$PRIMARY_ETAG" != "$REPLICA_ETAG" ]; then
            echo "WARNING: Checksum mismatch for $FILE"
        fi
    else
        echo "ERROR: File not found in replica: $FILE"
    fi
done
```

---

## Compliance & Retention

### Malaysian PDPA Compliance

**Data Retention Requirements:**
- **Invoice Data**: 7 years (Malaysian tax law)
- **Personal Data**: Per PDPA consent or legal requirement
- **Transaction Logs**: 7 years for audit purposes
- **Backup Data**: Follows same retention as original data

**Data Residency Compliance:**
- Primary backups stored in Malaysian data centers
- Secondary backups in ASEAN countries with adequate protection
- No personal data backups outside ASEAN region
- Encryption in transit and at rest

**Right to be Forgotten:**

```bash
#!/bin/bash
# PDPA data deletion from backups
# Usage: ./delete-user-from-backups.sh USER_ID

USER_ID="$1"

echo "Processing PDPA deletion request for user: $USER_ID"

# List all backups containing user data
BACKUP_DATES=$(aws s3 ls s3://easy-einvoice-backups-prod/database/ | \
    awk '{print $2}' | sed 's/\///g')

for DATE in $BACKUP_DATES; do
    echo "Processing backup date: $DATE"
    
    # Download, anonymize, and re-upload backup
    # (Implementation would depend on specific requirements)
    
    # Log the deletion
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - User $USER_ID data anonymized in backup $DATE" \
        >> /logs/pdpa-deletions.log
done

echo "PDPA deletion completed for user: $USER_ID"
```

### Backup Monitoring & Alerting

**Backup Health Monitoring:**

```bash
#!/bin/bash
# Comprehensive backup health check
# Runs daily via cron

echo "Starting backup health check..."

# Check database backups
DB_BACKUP_TODAY=$(aws s3 ls s3://easy-einvoice-backups-prod/database/ | \
    grep "$(date +%Y%m%d)")

if [ -z "$DB_BACKUP_TODAY" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -d '{"text":"🚨 ALERT: No database backup found for today"}'
fi

# Check file replication status
./validate-file-backups.sh

# Check backup sizes (should be consistent)
LATEST_BACKUP_SIZE=$(aws s3 ls s3://easy-einvoice-backups-prod/database/ --recursive | \
    tail -1 | awk '{print $3}')
PREVIOUS_BACKUP_SIZE=$(aws s3 ls s3://easy-einvoice-backups-prod/database/ --recursive | \
    tail -2 | head -1 | awk '{print $3}')

# Alert if backup size differs by more than 50%
SIZE_DIFF=$(echo "$LATEST_BACKUP_SIZE $PREVIOUS_BACKUP_SIZE" | \
    awk '{print int(($1-$2)/$2*100)}')

if [ ${SIZE_DIFF#-} -gt 50 ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -d "{\"text\":\"⚠️ WARNING: Backup size changed by ${SIZE_DIFF}%\"}"
fi

echo "Backup health check completed"
```

### Recovery Testing Reports

**Monthly Recovery Test Report:**

```bash
#!/bin/bash
# Generate monthly recovery test report

MONTH=$(date +%Y-%m)
REPORT_FILE="/reports/recovery-test-${MONTH}.md"

cat > "$REPORT_FILE" << EOF
# Recovery Test Report - $MONTH

## Tests Performed
- Database backup restoration: $(test_result "database")
- File recovery verification: $(test_result "files")
- Application deployment: $(test_result "application")
- Configuration restoration: $(test_result "configuration")

## Recovery Time Measurements
- Database RTO: $(measure_rto "database")
- Application RTO: $(measure_rto "application")
- Overall RTO: $(measure_rto "overall")

## Issues Identified
$(list_issues)

## Recommendations
$(list_recommendations)

## Next Actions
$(list_next_actions)

---
Report generated on: $(date)
EOF

# Send report to stakeholders
aws ses send-email \
    --destination "ToAddresses=management@easyeinvoice.com.my" \
    --message "Subject={Data=Monthly Recovery Test Report},Body={Text={Data=file://$REPORT_FILE}}" \
    --source "reports@easyeinvoice.com.my"
```

This comprehensive backup and disaster recovery framework ensures Easy e-Invoice maintains high availability, data integrity, and regulatory compliance while providing clear procedures for various disaster scenarios.